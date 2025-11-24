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
import cv2

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
print("🚀 Initializing PaddleOCR with CPU-optimized settings...", flush=True)

# Use CPU-friendly settings to avoid "could not execute a primitive" errors
ocr = PaddleOCR(
    use_angle_cls=True,        # Enable angle classification
    lang='en',                 # English language
    show_log=False,            # Disable verbose logging
    use_gpu=False,             # Explicitly use CPU
    enable_mkldnn=False,       # Disable MKL-DNN optimization (can cause issues)
    cpu_threads=1,             # Use single thread to avoid race conditions
    use_tensorrt=False,        # Disable TensorRT
    use_mp=False,              # Disable multiprocessing
)
print("✅ PaddleOCR initialized successfully", flush=True)
logger.info("✅ PaddleOCR initialized successfully")

# Track readiness state
ocr_ready = False
ocr_warmup_error = None

def warmup_ocr():
    """
    Warm up PaddleOCR by running a test inference.
    This ensures the model is fully loaded and ready to process images.
    """
    global ocr_ready, ocr_warmup_error

    try:
        print("🔥 Warming up PaddleOCR with test image...", flush=True)
        logger.info("🔥 Warming up PaddleOCR with test image...")

        # Create a small test image (100x100 white background with black text)
        test_image = np.ones((100, 100, 3), dtype=np.uint8) * 255
        cv2.putText(test_image, "TEST", (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)

        # Run OCR on test image
        result = ocr.ocr(test_image, cls=True)

        ocr_ready = True
        ocr_warmup_error = None
        print("✅ PaddleOCR warmup complete - ready to process images", flush=True)
        logger.info("✅ PaddleOCR warmup complete - ready to process images")
        return True

    except Exception as e:
        ocr_ready = False
        ocr_warmup_error = str(e)
        print(f"❌ PaddleOCR warmup failed: {e}", flush=True)
        print("⚠️  PaddleOCR is NOT ready - will retry on first request", flush=True)
        logger.error(f"❌ PaddleOCR warmup failed: {e}")
        logger.error("⚠️  PaddleOCR is NOT ready - will retry on first request")
        return False

# Attempt warmup on startup
print("=" * 60, flush=True)
print("🚀 STARTING PADDLEOCR WARMUP", flush=True)
print("=" * 60, flush=True)
warmup_ocr()
print("=" * 60, flush=True)


def detect_table_columns_histogram(blocks, image_width):
    """
    Detect table columns using histogram analysis of x-coordinates.
    Returns list of column boundaries (x-coordinates).
    """
    if not blocks or len(blocks) < 5:
        return []

    # Extract x-coordinates (left edge of each block)
    x_coords = []
    for block in blocks:
        bbox = block.get('bbox', [])
        if bbox and len(bbox) > 0:
            xs = [coord[0] for coord in bbox]
            min_x = min(xs)
            x_coords.append(min_x)

    if len(x_coords) < 5:
        return []

    # Create histogram with adaptive binning
    num_bins = max(20, image_width // 40)
    hist, bin_edges = np.histogram(x_coords, bins=num_bins, range=(0, image_width))

    # Find peaks in histogram (column starts)
    # A peak must have at least 5% of total blocks
    threshold = max(3, len(blocks) // 20)

    peaks = []
    for i in range(1, len(hist) - 1):
        # Peak detection: higher than neighbors and above threshold
        if hist[i] >= threshold and hist[i] >= hist[i-1] and hist[i] >= hist[i+1]:
            peak_x = (bin_edges[i] + bin_edges[i+1]) / 2
            peaks.append(peak_x)

    # Merge peaks that are too close (within 50 pixels)
    if len(peaks) > 1:
        merged_peaks = [peaks[0]]
        for peak in peaks[1:]:
            if peak - merged_peaks[-1] > 50:
                merged_peaks.append(peak)
        peaks = merged_peaks

    if len(peaks) >= 2:
        logger.info(f"📊 Detected {len(peaks)} table columns at x-positions: {[int(x) for x in peaks]}")
        print(f"[TABLE DETECTION] Found {len(peaks)} columns at x={[int(x) for x in peaks]}", flush=True)
        return sorted(peaks)

    print(f"[TABLE DETECTION] No multi-column table detected (found {len(peaks)} peaks)", flush=True)
    return []


def sort_blocks_by_table_columns(blocks, image_width):
    """
    Sort text blocks for table layout: detect columns, then read top-to-bottom within each column.
    """
    if not blocks or len(blocks) == 0:
        return blocks

    # Detect column boundaries
    column_boundaries = detect_table_columns_histogram(blocks, image_width)

    if not column_boundaries or len(column_boundaries) < 2:
        logger.info("📐 No multi-column table detected, using standard sorting")
        print(f"[SORTING] Using standard top-to-bottom, left-to-right sorting", flush=True)
        # Fall back to standard top-to-bottom, left-to-right sorting
        return sorted(blocks, key=lambda b: (b['bbox'][0][1], b['bbox'][0][0]))

    # Assign each block to a column
    blocks_with_column = []
    for block in blocks:
        bbox = block.get('bbox', [])
        if not bbox or len(bbox) == 0:
            continue

        # Get block position (left edge, top edge)
        xs = [coord[0] for coord in bbox]
        ys = [coord[1] for coord in bbox]
        min_x = min(xs)
        min_y = min(ys)

        # Determine which column this block belongs to
        column_idx = 0
        for i, boundary in enumerate(column_boundaries):
            if min_x >= boundary:
                column_idx = i + 1

        blocks_with_column.append({
            'block': block,
            'column': column_idx,
            'y': min_y,
            'x': min_x
        })

    # Sort by column first, then by Y (top to bottom) within each column
    sorted_blocks_data = sorted(blocks_with_column, key=lambda b: (b['column'], b['y'], b['x']))

    logger.info(f"📐 Sorted {len(blocks)} blocks across {len(column_boundaries) + 1} columns (table mode)")
    print(f"[SORTING] Sorted {len(blocks)} blocks across {len(column_boundaries) + 1} columns (table mode)", flush=True)

    # Debug: show column distribution
    column_counts = {}
    for item in sorted_blocks_data:
        col = item['column']
        column_counts[col] = column_counts.get(col, 0) + 1
    print(f"[SORTING] Column distribution: {column_counts}", flush=True)

    return [item['block'] for item in sorted_blocks_data]


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint - checks if Flask server is running"""
    return jsonify({'status': 'healthy', 'service': 'PaddleOCR'}), 200


@app.route('/ready', methods=['GET'])
def ready():
    """
    Readiness check endpoint - checks if PaddleOCR is fully initialized and ready to process images.
    Returns 200 if ready, 503 if not ready yet.
    """
    global ocr_ready, ocr_warmup_error

    if ocr_ready:
        return jsonify({
            'status': 'ready',
            'service': 'PaddleOCR',
            'message': 'PaddleOCR is ready to process images'
        }), 200
    else:
        # Try warmup again if it failed before
        if warmup_ocr():
            return jsonify({
                'status': 'ready',
                'service': 'PaddleOCR',
                'message': 'PaddleOCR is ready to process images'
            }), 200
        else:
            return jsonify({
                'status': 'not_ready',
                'service': 'PaddleOCR',
                'message': 'PaddleOCR is still initializing. Please wait and try again.',
                'error': ocr_warmup_error
            }), 503


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

    global ocr_ready, ocr_warmup_error

    try:
        logger.info("═══════════════════════════════════════════════════")
        logger.info("🚀 NEW OCR REQUEST RECEIVED")
        logger.info("═══════════════════════════════════════════════════")

        # Check if PaddleOCR is ready
        if not ocr_ready:
            logger.warning("⚠️  PaddleOCR is not ready yet - attempting warmup...")
            if not warmup_ocr():
                error_msg = f"PaddleOCR is not ready. The container may still be initializing. Please wait a moment and try again."
                if ocr_warmup_error:
                    error_msg += f" Error: {ocr_warmup_error}"
                logger.error(f"❌ {error_msg}")
                return jsonify({
                    'error': error_msg,
                    'status': 'not_ready',
                    'hint': 'Wait 10-30 seconds after container start, then try again. If the problem persists, restart the container with: docker compose restart paddleocr'
                }), 503

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

        # Store image dimensions for table detection
        image_height, image_width = image_np.shape[:2]
        logger.info(f"📐 Image dimensions: {image_width}x{image_height}")

        logger.info("─────────────────────────────────────────────────")
        logger.info("🔄 STARTING PADDLEOCR PROCESSING")
        logger.info("─────────────────────────────────────────────────")

        # Retry logic for "could not execute a primitive" error
        max_retries = 3
        retry_delay = 1  # seconds
        result = None

        for attempt in range(max_retries):
            try:
                if attempt > 0:
                    logger.info(f"🔄 Retry attempt {attempt + 1}/{max_retries} after {retry_delay}s delay...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff

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

                # Success - break out of retry loop
                break

            except RuntimeError as e:
                elapsed = time.time() - start_time
                error_msg = str(e)

                # Check if it's the "could not execute a primitive" error
                if "could not execute a primitive" in error_msg:
                    logger.warning("═══════════════════════════════════════════════════")
                    logger.warning(f"⚠️  PADDLEOCR RUNTIME ERROR (attempt {attempt + 1}/{max_retries})")
                    logger.warning(f"⚠️  Error: {error_msg}")
                    logger.warning("═══════════════════════════════════════════════════")

                    if attempt < max_retries - 1:
                        logger.warning(f"🔄 Will retry in {retry_delay}s...")
                        continue
                    else:
                        logger.error("═══════════════════════════════════════════════════")
                        logger.error(f"❌ PADDLEOCR FAILED after {max_retries} attempts ({elapsed:.2f}s total)")
                        logger.error(f"❌ Error: {error_msg}")
                        logger.error("═══════════════════════════════════════════════════")
                        logger.error("💡 TROUBLESHOOTING:")
                        logger.error("   1. This error is often caused by CPU instruction set incompatibility")
                        logger.error("   2. Try restarting the container: docker compose restart paddleocr")
                        logger.error("   3. If problem persists, rebuild: docker compose up -d --build paddleocr")
                        logger.error("   4. Check Docker resource limits (CPU/Memory)")
                        logger.error("   5. Consider using Gemini Vision API as alternative")
                        logger.error("═══════════════════════════════════════════════════")
                        import traceback
                        full_traceback = traceback.format_exc()
                        logger.error("📋 FULL TRACEBACK:")
                        logger.error(full_traceback)
                        logger.error("═══════════════════════════════════════════════════")
                        raise
                else:
                    # Different RuntimeError - don't retry
                    logger.error("═══════════════════════════════════════════════════")
                    logger.error(f"❌ PADDLEOCR RUNTIME ERROR after {elapsed:.2f}s")
                    logger.error(f"❌ Error: {error_msg}")
                    logger.error("═══════════════════════════════════════════════════")
                    import traceback
                    full_traceback = traceback.format_exc()
                    logger.error("📋 FULL TRACEBACK:")
                    logger.error(full_traceback)
                    logger.error("═══════════════════════════════════════════════════")
                    raise

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

        # Check if we got a result
        if result is None:
            raise RuntimeError("PaddleOCR failed to produce a result after all retries")

        # Transform PaddleOCR result to our format
        logger.info("─────────────────────────────────────────────────")
        logger.info("📦 TRANSFORMING RESULTS")
        logger.info("─────────────────────────────────────────────────")

        blocks = []

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
            else:
                logger.warning("PaddleOCR returned empty page result")
        else:
            logger.warning("PaddleOCR returned empty result")

        # Sort blocks using table-aware algorithm
        logger.info("─────────────────────────────────────────────────")
        logger.info("📊 SORTING TEXT BLOCKS (TABLE-AWARE)")
        logger.info("─────────────────────────────────────────────────")

        # Use table-aware sorting that detects columns
        sorted_blocks = sort_blocks_by_table_columns(blocks, image_width)

        # Combine sorted text
        sorted_text_lines = [block['text'] for block in sorted_blocks]
        full_text = '\n'.join(sorted_text_lines)

        total_elapsed = time.time() - start_time
        logger.info("═══════════════════════════════════════════════════")
        logger.info(f"✅ SUCCESS: Extracted {len(sorted_blocks)} text blocks")
        logger.info(f"⏱️  Total processing time: {total_elapsed:.2f}s")
        logger.info("═══════════════════════════════════════════════════")

        return jsonify({
            'text': full_text,
            'blocks': sorted_blocks,
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

