"""
PDF Ingestor — extracts text from PDF files, chunks, and stores
in the vector database. Useful for insurance documents, medical guides, etc.
"""

import hashlib
import os
from PyPDF2 import PdfReader
from core.chunker import chunk_text
from core.vector_store import VectorStore
from config.settings import Config


class PDFIngestor:
    SOURCE_TYPE = "pdf"

    def __init__(self, vector_store: VectorStore):
        self.store = vector_store

    def extract_text(self, pdf_path: str) -> str:
        """Extract all text from a PDF file."""
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip()

    def ingest_file(self, pdf_path: str, title: str = None) -> dict:
        """
        Ingest a single PDF file.

        Args:
            pdf_path: Path to the PDF file
            title: Optional title (defaults to filename)

        Returns:
            Summary dict
        """
        if not os.path.exists(pdf_path):
            return {"error": f"File not found: {pdf_path}"}

        title = title or os.path.basename(pdf_path)
        print(f"📄 Processing PDF: {title}")

        text = self.extract_text(pdf_path)
        if not text:
            return {"file": pdf_path, "title": title, "chunks_stored": 0, "success": False}

        chunks = chunk_text(text, Config.CHUNK_SIZE, Config.CHUNK_OVERLAP)

        metadatas = []
        ids = []
        for i, chunk in enumerate(chunks):
            chunk_id = hashlib.md5(f"pdf_{pdf_path}_{i}".encode()).hexdigest()
            ids.append(chunk_id)
            metadatas.append(
                {
                    "source_type": self.SOURCE_TYPE,
                    "source": pdf_path,
                    "title": title,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                }
            )

        self.store.add_documents(chunks, metadatas, ids)
        print(f"  ✅ Stored {len(chunks)} chunks from {title}")

        return {
            "file": pdf_path,
            "title": title,
            "chunks_stored": len(chunks),
            "success": True,
        }

    def ingest_directory(self, dir_path: str) -> list[dict]:
        """Ingest all PDFs in a directory."""
        results = []
        for filename in os.listdir(dir_path):
            if filename.lower().endswith(".pdf"):
                result = self.ingest_file(os.path.join(dir_path, filename))
                results.append(result)
        return results
