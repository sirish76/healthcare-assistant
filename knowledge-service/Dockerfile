FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Ensure setuptools is available
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Install CPU-only torch first to avoid huge NVIDIA packages
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Install whisper with no build isolation so it finds setuptools
RUN pip install --no-cache-dir --no-build-isolation openai-whisper

RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the embedding model
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Pre-download Whisper base model so it's baked into the image
RUN python -c "import whisper; whisper.load_model('base')"

COPY . .

RUN mkdir -p /app/data/chromadb /app/data/pdfs

EXPOSE 8081

CMD ["python", "server.py"]
