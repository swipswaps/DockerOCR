#!/usr/bin/env python3
"""
PaddleOCR Server
Provides OCR API endpoint for the DockerOCR Dashboard
"""

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from paddleocr import PaddleOCR
import base64
import io
from PIL import Image
import logging
import numpy as np
import sys
from collections import deque
from datetime import datetime

# Configure logging with custom handler to capture logs
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

# Store recent logs in memory (last 100 lines)
recent_logs = deque(maxlen=100)

# Custom logging handler to capture logs
class LogCapture(logging.Handler):
    def emit(self, record):
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'level': record.levelname,
            'message': self.format(record)
        }
        recent_logs.append(log_entry)

# Add custom handler
log_capture = LogCapture()
log_capture.setFormatter(logging.Formatter('%(message)s'))
logger.addHandler(log_capture)

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Initialize PaddleOCR (this will download models on first run)
logger.info("🚀 Initializing PaddleOCR...")
ocr = PaddleOCR(
    use_angle_cls=True,   # Enable angle classification
    lang='en',            # English language
    show_log=False        # Disable verbose logging
)
logger.info("✅ PaddleOCR initialized successfully")


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'PaddleOCR'}), 200


@app.route('/logs', methods=['GET'])
def get_logs():
    """Get recent logs from the container"""
    return jsonify({
        'logs': list(recent_logs),
        'count': len(recent_logs)
    }), 200


@app.route('/ocr', methods=['POST'])
def perform_ocr():
    """
    OCR endpoint
    Expects JSON: { "image": "base64_string", "filename": "optional_name" }
    Returns: { "text": "full_text", "blocks": [...] }
    """
    import time
    start_time = time.time()

    try:
        logger.info("═══════════════════════════════════════════════════")
        logger.info("🚀 NEW OCR REQUEST RECEIVED")
        logger.info("═══════════════════════════════════════════════════")

        data = request.get_json()

        if not data or 'image' not in data:
            logger.error("❌ No image data provided in request")
            return jsonify({'error': 'No image data provided'}), 400

        filename = data.get('filename', 'unknown')
        logger.info(f"📥 Processing image: {filename}")
        logger.info(f"📊 Base64 data size: {len(data['image'])} bytes")

        # Decode base64 image
        logger.info("🔓 Decoding base64 image data...")
        image_data = base64.b64decode(data['image'])
        logger.info(f"✅ Decoded {len(image_data)} bytes")

        logger.info("🖼️  Opening image with PIL...")
        image = Image.open(io.BytesIO(image_data))
        logger.info(f"✅ Image opened: {image.size}, mode: {image.mode}")

        # Convert to RGB if necessary
        if image.mode != 'RGB':
            logger.info(f"🔄 Converting from {image.mode} to RGB...")
            image = image.convert('RGB')
            logger.info("✅ Converted to RGB")

        # Perform OCR using the new predict() API
        # Convert PIL Image to numpy array
        logger.info("🔢 Converting PIL Image to numpy array...")
        image_np = np.array(image)
        logger.info(f"✅ Numpy array created: shape={image_np.shape}, dtype={image_np.dtype}")

        logger.info("─────────────────────────────────────────────────")
        logger.info("🔄 STARTING PADDLEOCR PROCESSING")
        logger.info("─────────────────────────────────────────────────")

        try:
            # Use the older ocr() API which is more stable
            logger.info("🚀 Loading PP-OCRv4 detection model...")
            logger.info("⏳ This may take a moment on first run or with large images...")

            result = ocr.ocr(image_np, cls=True)

            elapsed = time.time() - start_time
            logger.info(f"✅ PaddleOCR detection complete in {elapsed:.2f}s")

            # Debug: Log the result structure
            logger.info(f"📊 Result type: {type(result)}, length: {len(result) if result else 0}")
            if result and len(result) > 0:
                logger.info(f"📄 First page has {len(result[0])} text lines")
                logger.info("🔍 Running classification & text recognition heads...")
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error("═══════════════════════════════════════════════════")
            logger.error(f"❌ PADDLEOCR FAILED after {elapsed:.2f}s")
            logger.error(f"❌ Error type: {type(e).__name__}")
            logger.error(f"❌ Error message: {str(e)}")
            logger.error("═══════════════════════════════════════════════════")
            import traceback
            full_traceback = traceback.format_exc()
            logger.error("📋 FULL TRACEBACK:")
            logger.error(full_traceback)
            logger.error("═══════════════════════════════════════════════════")
            raise

        # Transform PaddleOCR result to our format
        logger.info("─────────────────────────────────────────────────")
        logger.info("📦 TRANSFORMING RESULTS")
        logger.info("─────────────────────────────────────────────────")

        blocks = []
        full_text_lines = []

        # The ocr() API returns a list of pages, each page is a list of text lines
        # Each line is: [bbox_coords, (text, confidence)]
        if result and len(result) > 0:
            page_result = result[0]  # Get first page

            if page_result:
                logger.info(f"📦 Processing {len(page_result)} bounding boxes...")
                logger.info(f"🔍 Extracting text and confidence scores...")

                for line in page_result:
                    # line[0] = bbox coordinates [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
                    # line[1] = (text, confidence)
                    bbox_coords = line[0]
                    text_info = line[1]

                    text = text_info[0]
                    confidence = float(text_info[1])

                    # Convert bbox to our format
                    bbox = [[float(x), float(y)] for x, y in bbox_coords]

                    blocks.append({
                        'text': text,
                        'confidence': confidence,
                        'bbox': bbox
                    })

                    full_text_lines.append(text)
            else:
                logger.warning("PaddleOCR returned empty page result")
        else:
            logger.warning("PaddleOCR returned empty result")
        
        # Combine all text
        full_text = '\n'.join(full_text_lines)

        total_elapsed = time.time() - start_time
        logger.info("═══════════════════════════════════════════════════")
        logger.info(f"✅ SUCCESS: Extracted {len(blocks)} text blocks")
        logger.info(f"⏱️  Total processing time: {total_elapsed:.2f}s")
        logger.info("═══════════════════════════════════════════════════")

        return jsonify({
            'text': full_text,
            'blocks': blocks,
            'filename': filename
        }), 200

    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        total_elapsed = time.time() - start_time

        logger.error("═══════════════════════════════════════════════════")
        logger.error(f"❌ EXCEPTION CAUGHT after {total_elapsed:.2f}s")
        logger.error(f"❌ Error type: {error_type}")
        logger.error(f"❌ Error message: {error_msg}")
        logger.error("═══════════════════════════════════════════════════")

        import traceback
        full_traceback = traceback.format_exc()
        logger.error("📋 FULL EXCEPTION TRACEBACK:")
        logger.error(full_traceback)
        logger.error("═══════════════════════════════════════════════════")

        # Return detailed error information to frontend
        return jsonify({
            'error': error_msg,
            'error_type': error_type,
            'traceback': full_traceback,
            'hint': get_error_hint(error_type, error_msg)
        }), 500


def get_error_hint(error_type, error_msg):
    """Provide user-friendly hints for common errors"""
    if 'could not execute a primitive' in error_msg:
        return 'PaddlePaddle runtime error. This usually resolves on retry. The container may need more memory or CPU resources.'
    elif 'out of memory' in error_msg.lower():
        return 'Container ran out of memory. Try reducing image size or increasing Docker memory limit.'
    elif 'timeout' in error_msg.lower():
        return 'Processing timeout. Try a smaller image or increase timeout settings.'
    else:
        return f'{error_type}: {error_msg}'


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)

