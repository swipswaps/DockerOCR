#!/usr/bin/env python3
"""
Test script to verify PaddleOCR "could not execute a primitive" fix
"""
import requests
import base64
import json
from PIL import Image
import io

# Create a simple test image
def create_test_image():
    """Create a simple test image with text"""
    img = Image.new('RGB', (400, 200), color='white')
    from PIL import ImageDraw, ImageFont
    draw = ImageDraw.Draw(img)
    
    # Draw some text
    text = "Test OCR\nLine 2\nLine 3"
    draw.text((50, 50), text, fill='black')
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.read()).decode('utf-8')
    
    return img_base64

def test_paddleocr():
    """Test PaddleOCR endpoint"""
    print("=" * 60)
    print("Testing PaddleOCR with CPU-optimized settings")
    print("=" * 60)
    
    # Check health
    print("\n1. Checking health endpoint...")
    response = requests.get('http://localhost:5000/health')
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    
    # Check readiness
    print("\n2. Checking readiness endpoint...")
    response = requests.get('http://localhost:5000/ready')
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    
    # Test OCR
    print("\n3. Testing OCR extraction...")
    img_base64 = create_test_image()
    
    payload = {
        'image': img_base64,
        'filename': 'test.png'
    }
    
    print("   Sending request to /ocr endpoint...")
    response = requests.post(
        'http://localhost:5000/ocr',
        json=payload,
        timeout=60
    )
    
    print(f"   Status: {response.status_code}")
    
    if response.ok:
        result = response.json()
        print(f"   ✅ SUCCESS!")
        print(f"   Extracted text blocks: {len(result.get('blocks', []))}")
        print(f"   Full text length: {len(result.get('text', ''))}")
        if result.get('text'):
            print(f"   Text preview: {result['text'][:100]}...")
    else:
        print(f"   ❌ FAILED!")
        try:
            error_data = response.json()
            print(f"   Error: {error_data}")
        except:
            print(f"   Error: {response.text}")
    
    print("\n" + "=" * 60)
    return response.ok

if __name__ == "__main__":
    success = test_paddleocr()
    exit(0 if success else 1)

