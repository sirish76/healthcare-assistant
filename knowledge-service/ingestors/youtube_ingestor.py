"""
YouTube Ingestor — searches YouTube for healthcare topics,
extracts transcripts, chunks them, and stores in the vector database.
"""

import hashlib
from youtube_transcript_api import YouTubeTranscriptApi
from youtubesearchpython import VideosSearch
from core.chunker import chunk_text
from core.vector_store import VectorStore
from config.settings import Config


class YouTubeIngestor:
    SOURCE_TYPE = "youtube"

    def __init__(self, vector_store: VectorStore):
        self.store = vector_store

    def search_videos(self, query: str, max_results: int = None) -> list[dict]:
        """
        Search YouTube for videos matching a query.

        Returns:
            List of dicts with id, title, channel, duration, url
        """
        max_results = max_results or Config.YOUTUBE_MAX_RESULTS
        search = VideosSearch(query, limit=max_results)
        results = search.result().get("result", [])

        videos = []
        for r in results:
            videos.append(
                {
                    "id": r["id"],
                    "title": r.get("title", ""),
                    "channel": r.get("channel", {}).get("name", ""),
                    "duration": r.get("duration", ""),
                    "url": f"https://www.youtube.com/watch?v={r['id']}",
                    "views": r.get("viewCount", {}).get("short", ""),
                    "published": r.get("publishedTime", ""),
                }
            )

        return videos

    def get_transcript(self, video_id: str) -> str | None:
        """
        Extract transcript from a YouTube video.

        Returns:
            Full transcript text, or None if unavailable
        """
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            full_text = " ".join([entry["text"] for entry in transcript_list])
            return full_text
        except Exception as e:
            print(f"  ⚠ Could not get transcript for {video_id}: {e}")
            return None

    def ingest_video(self, video: dict) -> int:
        """
        Ingest a single video: get transcript, chunk it, store in vector DB.

        Returns:
            Number of chunks stored
        """
        transcript = self.get_transcript(video["id"])
        if not transcript:
            return 0

        chunks = chunk_text(transcript, Config.CHUNK_SIZE, Config.CHUNK_OVERLAP)
        if not chunks:
            return 0

        # Create metadata and IDs for each chunk
        metadatas = []
        ids = []
        for i, chunk in enumerate(chunks):
            chunk_id = hashlib.md5(f"{video['id']}_{i}".encode()).hexdigest()
            ids.append(chunk_id)
            metadatas.append(
                {
                    "source_type": self.SOURCE_TYPE,
                    "source": video["url"],
                    "title": video["title"],
                    "channel": video["channel"],
                    "video_id": video["id"],
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                }
            )

        self.store.add_documents(chunks, metadatas, ids)
        return len(chunks)

    def ingest_by_search(self, query: str, max_videos: int = None) -> dict:
        """
        Search YouTube and ingest transcripts for all results.

        Returns:
            Summary dict with counts
        """
        print(f"\n🔍 Searching YouTube: '{query}'")
        videos = self.search_videos(query, max_videos)
        print(f"  Found {len(videos)} videos")

        total_chunks = 0
        ingested = 0
        failed = 0

        for video in videos:
            print(f"  📹 Processing: {video['title'][:60]}...")
            chunks = self.ingest_video(video)
            if chunks > 0:
                total_chunks += chunks
                ingested += 1
                print(f"    ✅ Stored {chunks} chunks")
            else:
                failed += 1

        return {
            "query": query,
            "videos_found": len(videos),
            "videos_ingested": ingested,
            "videos_failed": failed,
            "total_chunks": total_chunks,
        }

    def ingest_default_topics(self) -> list[dict]:
        """
        Ingest transcripts for all default healthcare topics.

        Returns:
            List of summary dicts per topic
        """
        results = []
        for topic in Config.YOUTUBE_DEFAULT_TOPICS:
            result = self.ingest_by_search(topic)
            results.append(result)

        return results

    def ingest_single_video_by_url(self, url: str) -> dict:
        """
        Ingest a specific YouTube video by URL.

        Returns:
            Summary dict
        """
        # Extract video ID from URL
        video_id = None
        if "v=" in url:
            video_id = url.split("v=")[1].split("&")[0]
        elif "youtu.be/" in url:
            video_id = url.split("youtu.be/")[1].split("?")[0]

        if not video_id:
            return {"error": "Invalid YouTube URL"}

        video = {
            "id": video_id,
            "title": f"Video {video_id}",
            "channel": "",
            "url": url,
        }

        # Try to get video info
        try:
            search = VideosSearch(video_id, limit=1)
            results = search.result().get("result", [])
            if results:
                video["title"] = results[0].get("title", video["title"])
                video["channel"] = results[0].get("channel", {}).get("name", "")
        except Exception:
            pass

        chunks = self.ingest_video(video)
        return {
            "url": url,
            "video_id": video_id,
            "title": video["title"],
            "chunks_stored": chunks,
            "success": chunks > 0,
        }
