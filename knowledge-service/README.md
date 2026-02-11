# Knowledge Service for HealthAssist AI

A pluggable knowledge ingestion and retrieval service that powers the HealthAssist AI
chat assistant with real-world content from multiple sources.

## Architecture

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   YouTube    │  │    PDFs      │  │ Web Articles │
│ Transcripts  │  │  Documents   │  │  Blog Posts  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       └─────────────────┼─────────────────┘
                         ▼
              ┌─────────────────────┐
              │   Chunker + Embed   │
              │  (sentence-transformers) │
              └──────────┬──────────┘
                         ▼
              ┌─────────────────────┐
              │   ChromaDB Vector   │
              │      Database       │
              └──────────┬──────────┘
                         ▼
              ┌─────────────────────┐
              │   Flask REST API    │
              │   (port 8081)       │
              └──────────┬──────────┘
                         ▼
              ┌─────────────────────┐
              │  Java Backend       │
              │  queries context    │
              │  → sends to Claude  │
              └─────────────────────┘
```

## Quick Start

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Ingest content (offline)

```bash
# Ingest default healthcare YouTube topics (recommended first run)
python ingest.py youtube --defaults

# Search and ingest specific topics
python ingest.py youtube --search "Medicare Part D explained"

# Ingest a specific video
python ingest.py youtube --url "https://www.youtube.com/watch?v=VIDEO_ID"

# Ingest a PDF
python ingest.py pdf --file /path/to/insurance-guide.pdf

# Ingest a web article
python ingest.py web --url "https://www.healthcare.gov/glossary/deductible/"

# Ingest multiple URLs from a file
python ingest.py web --file urls.txt

# Check stats
python ingest.py stats
```

### 3. Start the API server
```bash
python server.py
```

### 4. Query the knowledge base
```bash
curl "http://localhost:8081/api/knowledge/search?q=what+is+medicare+part+a"
```

## Docker

The service is included in docker-compose.ssl.yml:
```bash
docker-compose -f docker-compose.ssl.yml up --build -d
```

To ingest content inside the container:
```bash
docker exec -it healthassist-knowledge python ingest.py youtube --defaults
docker exec -it healthassist-knowledge python ingest.py stats
```

## Adding New Sources

To add a new knowledge source:

1. Create a new file in `ingestors/` (e.g., `rss_ingestor.py`)
2. Implement the class with these methods:
   - `ingest_*()` method that extracts text
   - Use `chunk_text()` from `core/chunker.py`
   - Store via `self.store.add_documents(chunks, metadatas, ids)`
3. Set `source_type` in metadata for filtering
4. Add CLI commands in `ingest.py`
5. Add API endpoint in `server.py`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/knowledge/search?q=...` | Search knowledge base |
| GET | `/api/knowledge/stats` | Get statistics |
| POST | `/api/knowledge/ingest/youtube` | Ingest YouTube videos |
| POST | `/api/knowledge/ingest/url` | Ingest a web article |
| POST | `/api/knowledge/ingest/pdf` | Ingest a PDF (multipart) |
| DELETE | `/api/knowledge/source` | Delete a source |
| GET | `/api/knowledge/health` | Health check |

## Java Backend Integration

Your Java backend should:
1. When a user sends a message, first query this service:
   ```
   GET http://knowledge:8081/api/knowledge/search?q=<user_message>&top_k=5
   ```
2. Include the returned context in the system prompt to Claude:
   ```
   Here is relevant context from our knowledge base:
   [context from search results]

   User question: <user_message>
   ```

