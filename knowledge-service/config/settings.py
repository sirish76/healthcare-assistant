import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # API Keys
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

    # ChromaDB
    CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./data/chromadb")
    COLLECTION_NAME = os.getenv("COLLECTION_NAME", "healthcare_knowledge")

    # Embedding model (runs locally, no API needed)
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

    # Chunking
    CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "500"))
    CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "50"))

    # Search
    TOP_K_RESULTS = int(os.getenv("TOP_K_RESULTS", "5"))

    # Server
    KNOWLEDGE_SERVICE_PORT = int(os.getenv("KNOWLEDGE_SERVICE_PORT", "8081"))

    # YouTube search defaults
    YOUTUBE_MAX_RESULTS = int(os.getenv("YOUTUBE_MAX_RESULTS", "10"))
    YOUTUBE_DEFAULT_TOPICS = [
        "Medicare explained",
        "Medicaid eligibility",
        "health insurance deductible copay",
        "how to choose health insurance plan",
        "Medicare Part A Part B difference",
        "Medicare Advantage plans",
        "ACA marketplace insurance",
        "prescription drug coverage Medicare Part D",
        "caregiver stress management",
        "holistic wellness for seniors",
        "navigating US healthcare system",
        "visitor health insurance USA",
    ]
