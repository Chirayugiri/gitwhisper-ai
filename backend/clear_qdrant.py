import os
import sys

# Add the parent directory to the path so we can import from app.config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import QDRANT_URL, QDRANT_API_KEY
from qdrant_client import QdrantClient

def clear_all_collections():
    if not QDRANT_URL:
        print("Error: QDRANT_URL is not set.")
        return

    print(f"Connecting to Qdrant at {QDRANT_URL}...")
    
    # Initialize QdrantClient
    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    
    try:
        # Get all collections
        collections_response = client.get_collections()
        collections = collections_response.collections
        
        if not collections:
            print("No collections found. The database is already clean.")
            return

        print(f"Found {len(collections)} collection(s). Deleting...")
        
        # Delete each collection
        for collection in collections:
            print(f" - Deleting collection: {collection.name}")
            client.delete_collection(collection_name=collection.name)
            
        print("All collections have been successfully deleted!")
        
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    confirm = input("Are you sure you want to delete ALL collections from the Qdrant database? (y/N): ")
    if confirm.lower() == 'y':
        clear_all_collections()
    else:
        print("Operation cancelled.")
