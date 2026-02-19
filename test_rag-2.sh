# Check knowledge service logs
docker logs healthassist-knowledge --tail 30

# Test the search endpoint directly
docker exec -it healthassist-knowledge python -c "
from core.vector_store import VectorStore
store = VectorStore()
results = store.query('What is Medicare Part B', n_results=3)
for i, doc in enumerate(results['documents'][0]):
    print(f'\n--- Result {i+1} ---')
    print(doc[:200])
    print(f'Source: {results[\"metadatas\"][0][i].get(\"source\", \"unknown\")}')
"
