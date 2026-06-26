import re
import uuid
from typing import List, Dict, Any, Optional, TypedDict
# pyrefly: ignore [missing-import]
from sentence_transformers import SentenceTransformer, CrossEncoder
# pyrefly: ignore [missing-import]
from qdrant_client.http.models import PointStruct

# pyrefly: ignore [missing-import]
from langchain_groq import ChatGroq
# pyrefly: ignore [missing-import]
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, BaseMessage
# pyrefly: ignore [missing-import]
from langgraph.graph import StateGraph, START, END

from app.config import THRESHOLD, MIN_RESULTS_FALLBACK, TOP_K_CHUNKS, MAX_CONTEXT_CHARS, LLM_API_KEY
from app.services.vector_store import search_collection

print("Loading models...")
extractor = SentenceTransformer('all-MiniLM-L6-v2')
reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
print("Models loaded.")

def embed_texts(texts: List[str]) -> List[List[float]]:
    return extractor.encode(texts, normalize_embeddings=True).tolist()

class GraphState(TypedDict):
    question: str
    history: List[Dict[str, str]]
    repo_label: str
    branch: str
    collection_name: str
    
    top_hybrid: List[Dict[str, Any]]
    snippets: List[Dict[str, Any]]
    context_text: str
    answer: str
    error: Optional[str]

def build_context(snippets: List[Dict[str, Any]]) -> str:
    parts = []
    total = 0
    for s in snippets:
        block = f"\n--- {s['path']} (lines {s['startLine']}-{s['endLine']}) ---\n{s['code']}\n"
        if total + len(block) > MAX_CONTEXT_CHARS: break
        parts.append(block)
        total += len(block)
    return "".join(parts)

# Nodes
def retrieve_node(state: GraphState):
    query_emb = embed_texts([state["question"]])[0]
    
    try:
        search_res = search_collection(
            collection_name=state["collection_name"],
            query_vector=query_emb,
            limit=20
        )
        return {"top_hybrid": search_res}
    except Exception as e:
        return {"error": f"Failed to search Qdrant: {str(e)}"}

def rerank_node(state: GraphState):
    if state.get("error"):
        return state
        
    top_hybrid = state.get("top_hybrid", [])
    reranked_results = []
    if top_hybrid:
        pairs = [[state["question"], chunk["code"]] for chunk in top_hybrid]
        scores = reranker.predict(pairs)
        for chunk, score in zip(top_hybrid, scores):
            reranked_results.append({"chunk": chunk, "score": float(score)})
            
    reranked_results.sort(key=lambda x: x["score"], reverse=True)
    
    final_chunks = [r["chunk"] for r in reranked_results if r["score"] >= THRESHOLD]
    if len(final_chunks) < MIN_RESULTS_FALLBACK:
        final_chunks = [r["chunk"] for r in reranked_results[:MIN_RESULTS_FALLBACK]]
        
    top = final_chunks[:TOP_K_CHUNKS]
    context_text = build_context(top)
    return {"snippets": top, "context_text": context_text}

def generate_node(state: GraphState):
    if state.get("error"):
        return state
        
    if not LLM_API_KEY:
        return {"error": "AI gateway not configured."}
        
    system_prompt = """You are GitWhisper, an expert code analyst answering questions about a GitHub repository.

FORMAT YOUR ANSWERS WELL using GitHub-flavored markdown:
- Use clear headings (##, ###) when the answer has multiple sections.
- Use bullet/numbered lists for enumerations.
- Use fenced code blocks with language hints for code (`...`).
- Use inline backticks for file paths, identifiers, and short code.
- Bold key terms.

CITATIONS:
- When you reference code, mention the file path inline in backticks (e.g., `src/auth.ts`).
- Be specific. Prefer concrete code references over vague descriptions.
- If the answer isn't in the provided context, say so honestly and suggest where to look.

Keep responses focused and information-dense."""

    user_prompt = f"""Repository: {state['repo_label']} (branch: {state['branch']})

Question: {state['question']}

Below are the most relevant code snippets retrieved using a semantic hybrid AST-chunking pipeline. Each is labeled with its file path and line range.

{state['context_text']}"""

    messages = [SystemMessage(content=system_prompt)]
    for m in state.get("history", []):
        if m["role"] == "user":
            messages.append(HumanMessage(content=m["content"]))
        else:
            messages.append(AIMessage(content=m["content"]))
    messages.append(HumanMessage(content=user_prompt))

    llm = ChatGroq(model_name="llama-3.3-70b-versatile", api_key=LLM_API_KEY)
    
    try:
        response = llm.invoke(messages)
        return {"answer": response.content}
    except Exception as e:
        return {"error": f"LLM generation failed: {str(e)}"}

# Define the graph
workflow = StateGraph(GraphState)

workflow.add_node("retrieve", retrieve_node)
workflow.add_node("rerank", rerank_node)
workflow.add_node("generate", generate_node)

workflow.add_edge(START, "retrieve")
workflow.add_edge("retrieve", "rerank")
workflow.add_edge("rerank", "generate")
workflow.add_edge("generate", END)

qa_graph = workflow.compile()
