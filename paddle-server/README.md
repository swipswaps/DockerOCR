# PaddleOCR Server

This is a Flask-based API server that provides OCR capabilities using PaddleOCR.

## Quick Start

### Using Docker Compose (Recommended)

From the project root directory:

```bash
# Start the PaddleOCR server
docker-compose up -d

# Check if it's running
curl http://localhost:5000/health

# View logs
docker-compose logs -f paddleocr

# Stop the server
docker-compose down
```

### Using Docker directly

```bash
# Build the image
cd paddle-server
docker build -t paddleocr-server .

# Run the container
docker run -d -p 5000:5000 --name paddleocr paddleocr-server

# Check health
curl http://localhost:5000/health
```

## API Endpoints

### Health Check
```
GET /health
```

Returns: `{"status": "healthy", "service": "PaddleOCR"}`

### OCR Extraction
```
POST /ocr
Content-Type: application/json

{
  "image": "base64_encoded_image_data",
  "filename": "optional_filename.jpg"
}
```

Returns:
```json
{
  "text": "Full extracted text with newlines",
  "blocks": [
    {
      "text": "Detected text",
      "confidence": 0.98,
      "bbox": [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
    }
  ],
  "filename": "optional_filename.jpg"
}
```

## Notes

- First run will download PaddleOCR models (~200MB)
- The server runs on port 5000
- CORS is enabled for frontend requests
- Supports English text recognition
- Includes text angle classification

