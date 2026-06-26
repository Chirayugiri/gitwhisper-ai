"""
FastAPI route handlers.

/api/ingest  – Fetch a GitHub repo, chunk it, and store vectors in Qdrant.
/api/ask     – Answer a question about an already-indexed (or auto-indexed) repo.
"""

import re
import time
import uuid

# pyrefly: ignore [missing-import]
from fastapi import APIRouter
from qdrant_client.http.models import Distance, PointStruct  # type: ignore[import]

from app.schemas import (
    AskRequest,
    AskResponse,
    AskResponseStats,
    IngestRequest,
    IngestResponse,
)
from app.services.chunking import chunk_file
from app.services.github import fetch_repo_files, parse_repo
from app.services.graph import embed_texts, qa_graph
from app.services.vector_store import (
    collection_exists,
    create_collection,
    upsert_points,
)

router = APIRouter()

_BATCH_SIZE = 64  # number of chunks to embed and upsert in one pass


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _collection_name(owner: str, repo: str) -> str:
    """Deterministic, Qdrant-safe collection name derived from owner/repo."""
    raw = f"repo_{owner}_{repo}"
    return re.sub(r"[^a-zA-Z0-9_]", "_", raw).lower()[:255]


def _ingest_chunks(chunks: list[dict], collection_name: str) -> None:
    """
    Embed ``chunks`` in batches and upsert them into Qdrant.
    The *text used for embedding* is the raw code so that the vector space
    captures code semantics (what the code *does*) rather than file metadata.
    """
    create_collection(collection_name)

    for batch_start in range(0, len(chunks), _BATCH_SIZE):
        batch = chunks[batch_start : batch_start + _BATCH_SIZE]
        texts = [c["code"] for c in batch]
        vectors = embed_texts(texts)

        points = [
            PointStruct(
                id=str(uuid.uuid4()),
                vector=vectors[i],
                payload=batch[i],          # store full chunk metadata as payload
            )
            for i in range(len(batch))
        ]
        upsert_points(collection_name, points)


# ---------------------------------------------------------------------------
# /api/ingest
# ---------------------------------------------------------------------------

@router.post("/ingest", response_model=IngestResponse)
def ingest_repo(req: IngestRequest):
    parsed = parse_repo(req.repo)
    if not parsed:
        return {"ok": False, "error": "Enter a repo as `owner/name` or a github.com URL."}

    collection_name = _collection_name(parsed["owner"], parsed["repo"])

    if collection_exists(collection_name):
        return {"ok": True, "message": "Repository already indexed.", "cached": True}

    try:
        fetched = fetch_repo_files(parsed["owner"], parsed["repo"])
    except (ValueError, RuntimeError) as exc:
        return {"ok": False, "error": str(exc)}
    except Exception as exc:
        return {"ok": False, "error": f"Unexpected error fetching repository: {exc}"}

    if not fetched["files"]:
        return {"ok": False, "error": "No readable text files found in this repository."}

    # Chunk every file using the appropriate language parser
    all_chunks: list[dict] = []
    for file_obj in fetched["files"]:
        all_chunks.extend(chunk_file(file_obj))

    if not all_chunks:
        return {"ok": False, "error": "No code chunks could be extracted."}

    try:
        _ingest_chunks(all_chunks, collection_name)
    except Exception as exc:
        return {"ok": False, "error": f"Failed to store data in vector database: {exc}"}

    return {
        "ok": True,
        "message": f"Indexed {len(all_chunks)} chunks from {len(fetched['files'])} files.",
        "cached": False,
        "files": fetched["files"],
        "branch": fetched["branch"],
    }


# ---------------------------------------------------------------------------
# /api/ask
# ---------------------------------------------------------------------------

@router.post("/ask", response_model=AskResponse)
def ask_repo(req: AskRequest):
    t0 = time.time()

    parsed = parse_repo(req.repo)
    if not parsed:
        return {"ok": False, "error": "Enter a repo as `owner/name` or a github.com URL."}

    collection_name = _collection_name(parsed["owner"], parsed["repo"])
    owner, repo_name = parsed["owner"], parsed["repo"]

    # --- Auto-ingest if not yet indexed ---
    branch = "main"
    files: list = []
    total_blobs = 0
    considered_files = 0
    total_chunks = 0
    used_cache = collection_exists(collection_name)

    if not used_cache:
        try:
            fetched = fetch_repo_files(owner, repo_name)
        except (ValueError, RuntimeError) as exc:
            return {"ok": False, "error": str(exc)}
        except Exception as exc:
            return {"ok": False, "error": f"Unexpected error fetching repository: {exc}"}

        branch = fetched["branch"]
        files = fetched["files"]
        total_blobs = fetched["totalBlobs"]
        considered_files = fetched["consideredFiles"]

        if not files:
            return {"ok": False, "error": "No readable text files found in this repository."}

        all_chunks: list[dict] = []
        for file_obj in files:
            all_chunks.extend(chunk_file(file_obj))

        if not all_chunks:
            return {"ok": False, "error": "No code chunks could be extracted."}

        total_chunks = len(all_chunks)

        try:
            _ingest_chunks(all_chunks, collection_name)
        except Exception as exc:
            return {"ok": False, "error": f"Failed to store data in vector database: {exc}"}

    fetch_ms = int((time.time() - t0) * 1000)

    # --- Run the LangGraph RAG pipeline ---
    ai_start = time.time()
    repo_label = f"{owner}/{repo_name}"

    initial_state = {
        "question":        req.question,
        "history":         [{"role": m.role, "content": m.content} for m in req.history],
        "repo_label":      repo_label,
        "branch":          branch,
        "collection_name": collection_name,
        "top_hybrid":      [],
        "snippets":        [],
        "context_text":    "",
        "answer":          "",
        "error":           None,
    }

    try:
        result_state = qa_graph.invoke(initial_state)
    except Exception as exc:
        return {"ok": False, "error": f"Graph execution failed: {exc}"}

    if result_state.get("error"):
        return {"ok": False, "error": result_state["error"]}

    ai_ms = int((time.time() - ai_start) * 1000)
    total_ms = int((time.time() - t0) * 1000)

    return {
        "ok":               True,
        "answer":           result_state["answer"],
        "repo":             repo_label,
        "branch":           branch,
        "snippets":         result_state.get("snippets", []),
        "retrieved_chunks": result_state.get("top_hybrid", []),
        "reranked_chunks":  result_state.get("snippets", []),
        "files":            None if used_cache else files,
        "stats": {
            "totalBlobs":      total_blobs,
            "consideredFiles": considered_files,
            "indexedFiles":    len(files),
            "totalChunks":     -1 if used_cache else total_chunks,
            "retrievedChunks": len(result_state.get("snippets", [])),
            "fetchMs":         fetch_ms,
            "aiMs":            ai_ms,
            "totalMs":         total_ms,
            "usedCache":       used_cache,
        },
    }
