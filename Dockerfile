# Production Dockerfile for Flask ML Backend
FROM python:3.10-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000

WORKDIR /app

# Install system dependencies required for LightGBM, XGBoost, and PyTorch
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy python dependencies list
COPY src/requirements.txt .

# Upgrade pip
RUN pip install --no-cache-dir --upgrade pip

# Step 1: Install PyTorch CPU (small wheel ~195MB)
RUN pip install --no-cache-dir torch==2.0.1+cpu --extra-index-url https://download.pytorch.org/whl/cpu

# Step 2: Install Web, Auth & DB dependencies + Google Generative AI
RUN pip install --no-cache-dir flask==2.3.0 flask-cors==4.0.0 flask-jwt-extended==4.5.2 pymongo==4.5.0 werkzeug==2.3.8 python-dotenv==1.0.0 certifi==2023.7.22 requests==2.31.0 google-generativeai gunicorn

# Step 3: Install PDF parsing & text utilities
RUN pip install --no-cache-dir nltk==3.8.1 pdfplumber==0.9.0 PyPDF2==3.0.1 joblib==1.3.1

# Step 4: Install Machine Learning & Data Science packages
RUN pip install --no-cache-dir numpy==1.26.4 pandas==2.0.3 scikit-learn==1.3.2 lightgbm==4.0.0 xgboost==1.5.0 transformers==4.30.0

# Pre-download NLTK data to avoid runtime network calls
RUN python -c "import nltk; nltk.download('punkt', quiet=True)"

# Copy backend application code
COPY src/app.py ./app.py
COPY src/Final ./Final
COPY src/service ./service

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Run Gunicorn WSGI server (1 worker with 4 threads to optimize RAM usage for PyTorch)
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app", "--workers", "1", "--threads", "4", "--timeout", "120"]
