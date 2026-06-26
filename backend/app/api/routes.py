import re
import uuid
import time
# pyrefly: ignore [missing-import]
from fastapi import APIRouter
# pyrefly: ignore [missing-import]
from qdrant_client.http.models import Distance, PointStruct
from app.schemas import IngestRequest, IngestResponse, AskRequest, AskResponse, AskResponseStats
from app.services.github import parse_repo, fetch_repo_files
from app.services.chunking import chunk_file_ast
from app.services.vector_store import collection_exists, create_collection, upsert_points
from app.services.graph import embed_texts, qa_graph

router = APIRouter()

@router.post("/ingest", response_model=IngestResponse)
def ingest_repo(req: IngestRequest):
    parsed = parse_repo(req.repo)
    if not parsed:
        return {"ok": False, "error": "Enter a repo as `owner/name` or a github.com URL."}
    
    collection_name = re.sub(r'[^a-zA-Z0-9_]', '_', f"repo_{parsed['owner']}_{parsed['repo']}").lower()[:255]
    
    if collection_exists(collection_name):
        return {"ok": True, "message": "Repository already indexed", "cached": True}
        
    try:
        fetched = fetch_repo_files(parsed["owner"], parsed["repo"])
        if not fetched["files"]:
            return {"ok": False, "error": "No readable text files found."}
            
        all_chunks = []
        for f in fetched["files"]:
            all_chunks.extend(chunk_file_ast(f))
            
        if not all_chunks:
            return {"ok": False, "error": "No code chunks could be extracted."}
            
        create_collection(collection_name)
        
        BATCH_SIZE = 50
        for i in range(0, len(all_chunks), BATCH_SIZE):
            batch = all_chunks[i:i + BATCH_SIZE]
            batch_codes = [c["code"] for c in batch]
            vectors = embed_texts(batch_codes)
            points = [
                PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vectors[idx],
                    payload=chunk
                )
                for idx, chunk in enumerate(batch)
            ]
            upsert_points(collection_name, points)
            
        return {"ok": True, "message": "Repository indexed successfully", "cached": False, "files": fetched["files"], "branch": fetched["branch"]}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@router.post("/ask", response_model=AskResponse)
def ask_repo(req: AskRequest):
    t0 = time.time()
    parsed = parse_repo(req.repo)
    if not parsed:
        return {"ok": False, "error": "Enter a repo as `owner/name` or a github.com URL."}
        
    collection_name = re.sub(r'[^a-zA-Z0-9_]', '_', f"repo_{parsed['owner']}_{parsed['repo']}").lower()[:255]
    
    branch = "main"
    files = []
    total_blobs = 0
    considered_files = 0
    used_cache = False
    total_chunks = 0
    
    if not collection_exists(collection_name):
        try:
            fetched = fetch_repo_files(parsed["owner"], parsed["repo"])
            branch = fetched["branch"]
            files = fetched["files"]
            total_blobs = fetched["totalBlobs"]
            considered_files = fetched["consideredFiles"]
        except Exception as e:
            return {"ok": False, "error": str(e)}
            
        if not files:
            return {"ok": False, "error": "No readable text files found in this repository."}
            
        all_chunks = []
        for f in files:
            all_chunks.extend(chunk_file_ast(f))
            
        if not all_chunks:
            return {"ok": False, "error": "No code chunks could be extracted."}
            
        total_chunks = len(all_chunks)
        
        try:
            create_collection(collection_name)
            BATCH_SIZE = 50
            for i in range(0, len(all_chunks), BATCH_SIZE):
                batch = all_chunks[i:i + BATCH_SIZE]
                batch_codes = [c["code"] for c in batch]
                vectors = embed_texts(batch_codes)
                points = [
                    PointStruct(
                        id=str(uuid.uuid4()),
                        vector=vectors[idx],
                        payload=chunk
                    )
                    for idx, chunk in enumerate(batch)
                ]
                upsert_points(collection_name, points)
        except Exception as e:
            print("Failed to ingest to Qdrant:", e)
            return {"ok": False, "error": "Failed to store data in vector database."}
    else:
        used_cache = True
        
    fetch_ms = int((time.time() - t0) * 1000)
    
    # LangGraph pipeline
    ai_start = time.time()
    repo_label = f"{parsed['owner']}/{parsed['repo']}"
    
    initial_state = {
        "question": req.question,
        "history": [{"role": m.role, "content": m.content} for m in req.history],
        "repo_label": repo_label,
        "branch": branch,
        "collection_name": collection_name,
        "top_hybrid": [],
        "snippets": [],
        "context_text": "",
        "answer": "",
        "error": None
    }
    
    try:
        result_state = qa_graph.invoke(initial_state)
    except Exception as e:
        return {"ok": False, "error": f"Graph execution failed: {str(e)}"}
        
    if result_state.get("error"):
        return {"ok": False, "error": result_state["error"]}
        
    ai_ms = int((time.time() - ai_start) * 1000)
    total_ms = int((time.time() - t0) * 1000)
    
    return {
        "ok": True,
        "answer": result_state["answer"],
        "repo": repo_label,
        "branch": branch,
        "snippets": result_state.get("snippets", []),
        "retrieved_chunks": result_state.get("top_hybrid", []),
        "reranked_chunks": result_state.get("snippets", []),
        "files": None if used_cache else files,
        "stats": {
            "totalBlobs": total_blobs,
            "consideredFiles": considered_files,
            "indexedFiles": len(files),
            "totalChunks": -1 if used_cache else total_chunks,
            "retrievedChunks": len(result_state.get("snippets", [])),
            "fetchMs": fetch_ms,
            "aiMs": ai_ms,
            "totalMs": total_ms,
            "usedCache": used_cache
        }
    }
