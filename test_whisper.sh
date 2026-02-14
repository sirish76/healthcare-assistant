docker exec -it healthassist-knowledge python -c "
from ingestors.youtube_ingestor import YouTubeIngestor
from core.vector_store import VectorStore

store = VectorStore()
yt = YouTubeIngestor(store)
transcript = yt._transcribe_with_whisper('dQw4w9WgXcQ')
print(f'Got {len(transcript)} chars' if transcript else 'FAILED')
"
