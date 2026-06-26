# pyrefly: ignore [missing-import]
from qdrant_client import QdrantClient
# pyrefly: ignore [missing-import]
from qdrant_client.http.models import Distance, VectorParams, PointStruct
from app.config import QDRANT_URL, QDRANT_API_KEY
from typing import List, Dict, Any

qdrant = QdrantClient(
    url=QDRANT_URL,
    api_key=QDRANT_API_KEY,
    check_compatibility=False,
    timeout=10
)

def collection_exists(collection_name: str) -> bool:
    try:
        collections = qdrant.get_collections()
        return any(c.name == collection_name for c in collections.collections)
    except Exception as e:
        print("Could not fetch Qdrant collections", e)
        return False

def create_collection(collection_name: str, size: int = 384, distance: Distance = Distance.COSINE):
    qdrant.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=size, distance=distance)
    )

def upsert_points(collection_name: str, points: List[PointStruct]):
    qdrant.upsert(collection_name=collection_name, points=points)

def search_collection(collection_name: str, query_vector: List[float], limit: int = 20) -> List[Dict[str, Any]]:
    search_res = qdrant.query_points(
        collection_name=collection_name,
        query=query_vector,
        limit=limit
    )
    return [p.payload for p in search_res.points]
