# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict

class Message(BaseModel):
    role: str
    content: str

class IngestRequest(BaseModel):
    repo: str = Field(min_length=3, max_length=140)

class AskRequest(BaseModel):
    repo: str = Field(min_length=3, max_length=140)
    question: str = Field(min_length=2, max_length=2000)
    history: List[Message] = []
    
class AskResponseStats(BaseModel):
    totalBlobs: int
    consideredFiles: int
    indexedFiles: int
    totalChunks: int
    retrievedChunks: int
    fetchMs: int
    aiMs: int
    totalMs: int
    usedCache: bool

class AskResponse(BaseModel):
    ok: bool
    answer: Optional[str] = None
    repo: Optional[str] = None
    branch: Optional[str] = None
    snippets: Optional[List[Dict[str, Any]]] = None
    retrieved_chunks: Optional[List[Dict[str, Any]]] = None
    reranked_chunks: Optional[List[Dict[str, Any]]] = None
    files: Optional[List[Dict[str, Any]]] = None
    stats: Optional[AskResponseStats] = None
    error: Optional[str] = None

class IngestResponse(BaseModel):
    ok: bool
    message: Optional[str] = None
    cached: Optional[bool] = None
    files: Optional[List[Dict[str, Any]]] = None
    branch: Optional[str] = None
    error: Optional[str] = None
