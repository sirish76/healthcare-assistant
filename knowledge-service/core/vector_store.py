"""
Vector store — wraps ChromaDB for document storage and semantic search.
All knowledge sources feed into this single store.
"""

import os
import chromadb
from chromadb.utils import embedding_functions
from config.settings import Config


class VectorStore:
    def __init__(self):
        os.makedirs(Config.CHROMA_PERSIST_DIR, exist_ok=True)
        self.client = chromadb.PersistentClient(path=Config.CHROMA_PERSIST_DIR)
        self.embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=Config.EMBEDDING_MODEL
        )
        self.collection = self.client.get_or_create_collection(
            name=Config.COLLECTION_NAME,
            embedding_function=self.embedding_fn,
            metadata={"hnsw:space": "cosine"},
        )

    def add_documents(self, chunks: list[str], metadatas: list[dict], ids: list[str]):
        """
        Add document chunks to the vector store.

        Args:
            chunks: List of text chunks
            metadatas: List of metadata dicts (source, title, source_type, etc.)
            ids: List of unique IDs for each chunk
        """
        if not chunks:
            return

        # ChromaDB has a batch limit, so we process in batches of 100
        batch_size = 100
        for i in range(0, len(chunks), batch_size):
            batch_chunks = chunks[i : i + batch_size]
            batch_meta = metadatas[i : i + batch_size]
            batch_ids = ids[i : i + batch_size]

            self.collection.upsert(
                documents=batch_chunks,
                metadatas=batch_meta,
                ids=batch_ids,
            )

    def search(self, query: str, top_k: int = None, source_type: str = None) -> list[dict]:
        """
        Semantic search across all knowledge.

        Args:
            query: The search query
            top_k: Number of results to return
            source_type: Optional filter by source type (e.g., 'youtube', 'pdf', 'web')

        Returns:
            List of dicts with 'text', 'metadata', and 'distance'
        """
        top_k = top_k or Config.TOP_K_RESULTS

        where_filter = None
        if source_type:
            where_filter = {"source_type": source_type}

        results = self.collection.query(
            query_texts=[query],
            n_results=top_k,
            where=where_filter,
        )

        output = []
        if results and results["documents"]:
            for i, doc in enumerate(results["documents"][0]):
                output.append(
                    {
                        "text": doc,
                        "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                        "distance": results["distances"][0][i] if results["distances"] else None,
                    }
                )

        return output

    def get_stats(self) -> dict:
        """Get stats about the knowledge base."""
        count = self.collection.count()

        # Get unique sources
        all_meta = self.collection.get(include=["metadatas"])
        source_types = {}
        sources = set()
        if all_meta and all_meta["metadatas"]:
            for meta in all_meta["metadatas"]:
                st = meta.get("source_type", "unknown")
                source_types[st] = source_types.get(st, 0) + 1
                sources.add(meta.get("source", "unknown"))

        return {
            "total_chunks": count,
            "source_types": source_types,
            "unique_sources": len(sources),
        }

    def delete_by_source(self, source: str):
        """Delete all chunks from a specific source."""
        self.collection.delete(where={"source": source})

    def clear_all(self):
        """Clear entire knowledge base."""
        self.client.delete_collection(Config.COLLECTION_NAME)
        self.collection = self.client.get_or_create_collection(
            name=Config.COLLECTION_NAME,
            embedding_function=self.embedding_fn,
            metadata={"hnsw:space": "cosine"},
        )
