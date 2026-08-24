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

# Step 1: Install CPU-only PyTorch first to prevent peak disk/RAM spikes
RUN pip install --no-cache-dir torch==2.0.1+cpu --extra-index-url https://download.pytorch.org/whl/cpu

# Step 2: Install remaining packages and gunicorn
RUN pip install --no-cache-dir -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir gunicorn

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
