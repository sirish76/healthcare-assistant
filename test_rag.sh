docker exec -it healthassist-knowledge python -c "
from core.vector_store import VectorStore
store = VectorStore()
print(f'Documents in vector store: {store.collection.count()}')
"
