FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgomp1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \
    "numpy<2.0.0" \
    paddlepaddle==2.6.2 \
    paddleocr==2.7.3 \
    flask==3.0.0 \
    flask-cors==4.0.0 \
    pillow

# Copy server code
COPY server.py .

# Expose port
EXPOSE 5000

# Run the server
CMD ["python", "server.py"]

