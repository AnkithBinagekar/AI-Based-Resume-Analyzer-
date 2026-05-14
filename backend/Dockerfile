# 1. Use the official lightweight Python image
FROM python:3.10-slim

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Install System Dependencies (Tesseract for OCR, Poppler for PDFs)
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# 4. Copy the requirements file into the container
COPY requirements.txt .

# 5. CRITICAL CLOUD OPTIMIZATION: Install CPU-only PyTorch FIRST
# This prevents downloading a 2.5GB+ GPU version, keeping the image lean and fast.
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu

# 6. Install all other Python packages (including PyJWT and scikit-learn)
RUN pip install --no-cache-dir -r requirements.txt

# 7. Download the spaCy English model (Bake it into the image)
RUN python -m spacy download en_core_web_sm

# 8. Copy the rest of your backend code into the container
COPY . .

# 9. Start the FastAPI application
# Binds to dynamic $PORT assigned by the cloud provider, defaults to 10000 locally
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]