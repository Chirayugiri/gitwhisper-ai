import os
from dotenv import load_dotenv
load_dotenv(".env")
from qdrant_client import QdrantClient

url = os.getenv("QDRANT_URL")
api_key = os.getenv("QDRANT_API_KEY")

print("URL:", url)

# Try with URL
client1 = QdrantClient(url=url, api_key=api_key)
try:
    print("client1 collections:", client1.get_collections())
except Exception as e:
    print("client1 failed:", e)

# Try with port 6333
client2 = QdrantClient(url=f"{url}:6333", api_key=api_key)
try:
    print("client2 collections:", client2.get_collections())
except Exception as e:
    print("client2 failed:", e)
