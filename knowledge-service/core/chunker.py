"""
Text chunker — splits documents into overlapping chunks for embedding.
Works with any text source.
"""


def chunk_text(text: str, chunk_size: int = 500, chunk_overlap: int = 50) -> list[str]:
    """
    Split text into overlapping chunks by word count.

    Args:
        text: The full text to chunk
        chunk_size: Target number of words per chunk
        chunk_overlap: Number of overlapping words between chunks

    Returns:
        List of text chunks
    """
    words = text.split()
    if len(words) <= chunk_size:
        return [text.strip()] if text.strip() else []

    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        if chunk.strip():
            chunks.append(chunk.strip())
        start += chunk_size - chunk_overlap

    return chunks
