# 1. Use the official Python 3.10 slim image (matching your Render logs)
FROM python:3.10-slim

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Install system dependencies (Tesseract OCR for image text, Poppler for PDFs)
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# 4. Copy your requirements file
COPY requirements.txt .

# 5. Install all Python packages
RUN pip install --no-cache-dir -r requirements.txt

# 6. CRITICAL FIX: Download the Spacy English language model
RUN python -m spacy download en_core_web_sm

# 7. Copy the rest of your backend code into the container
COPY . .

# 8. Command to run the application using Uvicorn
# (Render will automatically assign a port via the $PORT variable)
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}