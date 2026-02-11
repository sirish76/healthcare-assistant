"""
Web Article Ingestor — fetches web articles/pages, extracts text,
chunks, and stores in the vector database.
Useful for healthcare.gov pages, medical articles, blog posts, etc.
"""

import hashlib
import requests
from bs4 import BeautifulSoup
from core.chunker import chunk_text
from core.vector_store import VectorStore
from config.settings import Config


class WebIngestor:
    SOURCE_TYPE = "web"

    def __init__(self, vector_store: VectorStore):
        self.store = vector_store

    def fetch_and_extract(self, url: str) -> tuple[str, str]:
        """
        Fetch a web page and extract its text content.

        Returns:
            Tuple of (title, text)
        """
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; HealthAssistBot/1.0)"
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        # Get title
        title = ""
        if soup.title:
            title = soup.title.string or ""

        # Remove script, style, nav, footer elements
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()

        # Try to find main content
        main = soup.find("main") or soup.find("article") or soup.find("body")
        text = main.get_text(separator=" ", strip=True) if main else ""

        return title.strip(), text.strip()

    def ingest_url(self, url: str, title: str = None) -> dict:
        """
        Ingest a single web page.

        Args:
            url: URL to fetch
            title: Optional title override

        Returns:
            Summary dict
        """
        print(f"🌐 Processing URL: {url}")

        try:
            fetched_title, text = self.fetch_and_extract(url)
        except Exception as e:
            print(f"  ⚠ Failed to fetch {url}: {e}")
            return {"url": url, "error": str(e), "success": False}

        if not text:
            return {"url": url, "chunks_stored": 0, "success": False}

        title = title or fetched_title or url

        chunks = chunk_text(text, Config.CHUNK_SIZE, Config.CHUNK_OVERLAP)

        metadatas = []
        ids = []
        for i, chunk in enumerate(chunks):
            chunk_id = hashlib.md5(f"web_{url}_{i}".encode()).hexdigest()
            ids.append(chunk_id)
            metadatas.append(
                {
                    "source_type": self.SOURCE_TYPE,
                    "source": url,
                    "title": title,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                }
            )

        self.store.add_documents(chunks, metadatas, ids)
        print(f"  ✅ Stored {len(chunks)} chunks from {title[:60]}")

        return {
            "url": url,
            "title": title,
            "chunks_stored": len(chunks),
            "success": True,
        }

    def ingest_urls(self, urls: list[str]) -> list[dict]:
        """Ingest multiple URLs."""
        results = []
        for url in urls:
            result = self.ingest_url(url)
            results.append(result)
        return results
