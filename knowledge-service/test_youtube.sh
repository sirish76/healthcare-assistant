cd /home/ubuntu/healthcare-assistant/knowledge-service
python3 -c "
from core.vector_store import VectorStore
from ingestors.youtube_ingestor import YouTubeIngestor

store = VectorStore()
yt = YouTubeIngestor(store)

# Test full ingestion with a healthcare video
result = yt.ingest_single_video_by_url('https://www.youtube.com/watch?v=sshK1P7qkoc')
print(result)
"
