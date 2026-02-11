#!/usr/bin/env python3
"""
Knowledge Ingestion CLI
=======================
Offline tool to ingest content from various sources into the knowledge base.

Usage:
    # Ingest default YouTube healthcare topics
    python ingest.py youtube --defaults

    # Ingest YouTube videos by search query
    python ingest.py youtube --search "Medicare Part D explained"

    # Ingest a specific YouTube video
    python ingest.py youtube --url "https://www.youtube.com/watch?v=VIDEO_ID"

    # Ingest a PDF file
    python ingest.py pdf --file /path/to/document.pdf

    # Ingest all PDFs in a directory
    python ingest.py pdf --dir /path/to/pdfs/

    # Ingest a web article
    python ingest.py web --url "https://www.healthcare.gov/glossary/deductible/"

    # Ingest multiple URLs from a file (one URL per line)
    python ingest.py web --file urls.txt

    # Show knowledge base stats
    python ingest.py stats

    # Clear entire knowledge base
    python ingest.py clear
"""

import argparse
import json
import sys
from core.vector_store import VectorStore
from ingestors.youtube_ingestor import YouTubeIngestor
from ingestors.pdf_ingestor import PDFIngestor
from ingestors.web_ingestor import WebIngestor


def main():
    parser = argparse.ArgumentParser(
        description="Knowledge Base Ingestion Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    subparsers = parser.add_subparsers(dest="source", help="Knowledge source")

    # YouTube
    yt_parser = subparsers.add_parser("youtube", help="Ingest YouTube transcripts")
    yt_group = yt_parser.add_mutually_exclusive_group(required=True)
    yt_group.add_argument("--defaults", action="store_true", help="Ingest default healthcare topics")
    yt_group.add_argument("--search", type=str, help="Search query to find videos")
    yt_group.add_argument("--url", type=str, help="Specific YouTube video URL")
    yt_parser.add_argument("--max-videos", type=int, default=10, help="Max videos per search")

    # PDF
    pdf_parser = subparsers.add_parser("pdf", help="Ingest PDF documents")
    pdf_group = pdf_parser.add_mutually_exclusive_group(required=True)
    pdf_group.add_argument("--file", type=str, help="Path to a PDF file")
    pdf_group.add_argument("--dir", type=str, help="Path to a directory of PDFs")

    # Web
    web_parser = subparsers.add_parser("web", help="Ingest web articles")
    web_group = web_parser.add_mutually_exclusive_group(required=True)
    web_group.add_argument("--url", type=str, help="URL to ingest")
    web_group.add_argument("--file", type=str, help="File with URLs (one per line)")

    # Stats
    subparsers.add_parser("stats", help="Show knowledge base statistics")

    # Clear
    subparsers.add_parser("clear", help="Clear entire knowledge base")

    args = parser.parse_args()

    if not args.source:
        parser.print_help()
        sys.exit(1)

    # Initialize vector store
    store = VectorStore()

    if args.source == "youtube":
        ingestor = YouTubeIngestor(store)
        if args.defaults:
            print("=" * 60)
            print("🎬 Ingesting default healthcare YouTube topics")
            print("=" * 60)
            results = ingestor.ingest_default_topics()
            print("\n" + "=" * 60)
            print("📊 SUMMARY")
            print("=" * 60)
            total_videos = sum(r["videos_ingested"] for r in results)
            total_chunks = sum(r["total_chunks"] for r in results)
            print(f"Topics processed: {len(results)}")
            print(f"Videos ingested:  {total_videos}")
            print(f"Total chunks:     {total_chunks}")
        elif args.search:
            result = ingestor.ingest_by_search(args.search, args.max_videos)
            print(f"\n✅ Done: {result['videos_ingested']} videos, {result['total_chunks']} chunks")
        elif args.url:
            result = ingestor.ingest_single_video_by_url(args.url)
            print(f"\n{'✅' if result.get('success') else '❌'} {json.dumps(result, indent=2)}")

    elif args.source == "pdf":
        ingestor = PDFIngestor(store)
        if args.file:
            result = ingestor.ingest_file(args.file)
            print(f"\n{'✅' if result.get('success') else '❌'} {json.dumps(result, indent=2)}")
        elif args.dir:
            results = ingestor.ingest_directory(args.dir)
            total = sum(r.get("chunks_stored", 0) for r in results)
            print(f"\n✅ Ingested {len(results)} PDFs, {total} total chunks")

    elif args.source == "web":
        ingestor = WebIngestor(store)
        if args.url:
            result = ingestor.ingest_url(args.url)
            print(f"\n{'✅' if result.get('success') else '❌'} {json.dumps(result, indent=2)}")
        elif args.file:
            with open(args.file) as f:
                urls = [line.strip() for line in f if line.strip() and not line.startswith("#")]
            results = ingestor.ingest_urls(urls)
            total = sum(r.get("chunks_stored", 0) for r in results)
            print(f"\n✅ Ingested {len(results)} URLs, {total} total chunks")

    elif args.source == "stats":
        stats = store.get_stats()
        print("\n📊 Knowledge Base Statistics")
        print("=" * 40)
        print(f"Total chunks:    {stats['total_chunks']}")
        print(f"Unique sources:  {stats['unique_sources']}")
        print(f"Source types:")
        for st, count in stats["source_types"].items():
            print(f"  - {st}: {count} chunks")

    elif args.source == "clear":
        confirm = input("⚠️  Are you sure you want to clear the entire knowledge base? (yes/no): ")
        if confirm.lower() == "yes":
            store.clear_all()
            print("🗑️  Knowledge base cleared.")
        else:
            print("Cancelled.")


if __name__ == "__main__":
    main()
