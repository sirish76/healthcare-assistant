#!/usr/bin/env python3
"""
Knowledge Service API
=====================
REST API that exposes the knowledge base for the Java backend to query.
The Java backend calls this service to get relevant context before
sending it to Claude along with the user's question.

Endpoints:
    GET  /api/knowledge/search?q=<query>&top_k=5&source_type=youtube
    GET  /api/knowledge/stats
    POST /api/knowledge/ingest/youtube   {query, max_videos}
    POST /api/knowledge/ingest/url       {url, title}
    POST /api/knowledge/ingest/pdf       (multipart file upload)
    DELETE /api/knowledge/source          {source}
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from core.vector_store import VectorStore
from ingestors.youtube_ingestor import YouTubeIngestor
from ingestors.pdf_ingestor import PDFIngestor
from ingestors.web_ingestor import WebIngestor
from config.settings import Config
import tempfile
import os

app = Flask(__name__)
CORS(app)

# Initialize components
store = VectorStore()
yt_ingestor = YouTubeIngestor(store)
pdf_ingestor = PDFIngestor(store)
web_ingestor = WebIngestor(store)


@app.route("/api/knowledge/search", methods=["GET"])
def search():
    """
    Search the knowledge base.
    Called by the Java backend to get context for Claude.

    Query params:
        q: search query (required)
        top_k: number of results (default 5)
        source_type: filter by source type (optional)
    """
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"error": "Missing query parameter 'q'"}), 400

    top_k = request.args.get("top_k", Config.TOP_K_RESULTS, type=int)
    source_type = request.args.get("source_type", None)

    results = store.search(query, top_k=top_k, source_type=source_type)

    return jsonify(
        {
            "query": query,
            "results": results,
            "count": len(results),
        }
    )


@app.route("/api/knowledge/stats", methods=["GET"])
def stats():
    """Get knowledge base statistics."""
    return jsonify(store.get_stats())


@app.route("/api/knowledge/ingest/youtube", methods=["POST"])
def ingest_youtube():
    """
    Ingest YouTube videos by search query or URL.

    Body:
        query: search query (optional)
        url: specific video URL (optional)
        max_videos: max videos to process (default 10)
    """
    data = request.get_json()

    if data.get("url"):
        result = yt_ingestor.ingest_single_video_by_url(data["url"])
        return jsonify(result)
    elif data.get("query"):
        max_videos = data.get("max_videos", Config.YOUTUBE_MAX_RESULTS)
        result = yt_ingestor.ingest_by_search(data["query"], max_videos)
        return jsonify(result)
    else:
        return jsonify({"error": "Provide 'query' or 'url'"}), 400


@app.route("/api/knowledge/ingest/url", methods=["POST"])
def ingest_url():
    """
    Ingest a web article.

    Body:
        url: the URL to ingest (required)
        title: optional title override
    """
    data = request.get_json()
    url = data.get("url", "").strip()
    if not url:
        return jsonify({"error": "Missing 'url'"}), 400

    title = data.get("title")
    result = web_ingestor.ingest_url(url, title=title)
    return jsonify(result)


@app.route("/api/knowledge/ingest/pdf", methods=["POST"])
def ingest_pdf():
    """
    Ingest a PDF file.

    Expects multipart file upload with field name 'file'.
    Optional form field 'title'.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    title = request.form.get("title", file.filename)

    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        file.save(tmp.name)
        result = pdf_ingestor.ingest_file(tmp.name, title=title)
        os.unlink(tmp.name)

    return jsonify(result)


@app.route("/api/knowledge/source", methods=["DELETE"])
def delete_source():
    """
    Delete all chunks from a specific source.

    Body:
        source: the source identifier to delete
    """
    data = request.get_json()
    source = data.get("source", "").strip()
    if not source:
        return jsonify({"error": "Missing 'source'"}), 400

    store.delete_by_source(source)
    return jsonify({"deleted": source, "success": True})


@app.route("/api/knowledge/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "service": "knowledge-service"})


if __name__ == "__main__":
    print(f"🧠 Knowledge Service starting on port {Config.KNOWLEDGE_SERVICE_PORT}")
    print(f"📊 Knowledge base: {store.get_stats()}")
    app.run(host="0.0.0.0", port=Config.KNOWLEDGE_SERVICE_PORT, debug=False)
