#!/usr/bin/env python3
"""
PaddleOCR Server
Provides OCR API endpoint for the DockerOCR Dashboard
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from paddleocr import PaddleOCR
import base64
import io
from PIL import Image
import logging
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Initialize PaddleOCR (this will download models on first run)
logger.info("Initializing PaddleOCR...")
ocr = PaddleOCR(
    use_angle_cls=True,   # Enable angle classification
    lang='en',            # English language
    show_log=False        # Disable verbose logging
)
logger.info("PaddleOCR initialized successfully")


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'PaddleOCR'}), 200


@app.route('/ocr', methods=['POST'])
def perform_ocr():
    """
    OCR endpoint
    Expects JSON: { "image": "base64_string", "filename": "optional_name" }
    Returns: { "text": "full_text", "blocks": [...] }
    """
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
        # Decode base64 image
        image_data = base64.b64decode(data['image'])
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        filename = data.get('filename', 'unknown')
        logger.info(f"Processing image: {filename}")
        
        # Perform OCR using the new predict() API
        # Convert PIL Image to numpy array
        image_np = np.array(image)

        logger.info(f"Image shape: {image_np.shape}, dtype: {image_np.dtype}")

        try:
            # Use the older ocr() API which is more stable
            result = ocr.ocr(image_np, cls=True)

            # Debug: Log the result structure
            logger.info(f"PaddleOCR result type: {type(result)}, length: {len(result) if result else 0}")
            if result and len(result) > 0:
                logger.info(f"First page has {len(result[0])} text lines")
        except Exception as e:
            logger.error(f"PaddleOCR ocr() failed: {type(e).__name__}: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            raise

        # Transform PaddleOCR result to our format
        blocks = []
        full_text_lines = []

        # The ocr() API returns a list of pages, each page is a list of text lines
        # Each line is: [bbox_coords, (text, confidence)]
        if result and len(result) > 0:
            page_result = result[0]  # Get first page

            if page_result:
                logger.info(f"Found {len(page_result)} text blocks")

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
        
        logger.info(f"OCR complete: {len(blocks)} blocks detected")
        
        return jsonify({
            'text': full_text,
            'blocks': blocks,
            'filename': filename
        }), 200
        
    except Exception as e:
        logger.error(f"OCR error: {str(e)}")
        import traceback
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)

