#!/usr/bin/env python3
"""
Direct test of PaddleOCR server with official sorting algorithm
"""

import base64
import requests
import json
from PIL import Image

# Test configuration
IMAGE_PATH = "./sent-to-ocr-selenium.jpg"  # Use existing test image
PADDLE_URL = "http://localhost:5000/ocr"

def test_paddle_ocr():
    print("\n" + "="*60)
    print("🔍 DIRECT PADDLEOCR TEST - Official Sorting Algorithm")
    print("="*60)

    print(f"\n📁 Loading image: {IMAGE_PATH}")

    try:
        img = Image.open(IMAGE_PATH)
        print(f"✅ Loaded image: {img.size[0]}x{img.size[1]}")
    except Exception as e:
        print(f"❌ Error loading image: {e}")
        return

    # Convert to base64
    with open(IMAGE_PATH, "rb") as f:
        image_bytes = f.read()

    base64_data = base64.b64encode(image_bytes).decode('utf-8')
    print(f"✅ Encoded to base64: {len(base64_data)} characters")

    # Send to PaddleOCR
    print(f"\n🚀 Sending to PaddleOCR server...")

    payload = {
        "image": base64_data,
        "filename": IMAGE_PATH.split('/')[-1]
    }
    
    try:
        response = requests.post(PADDLE_URL, json=payload, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            
            extracted_text = result.get('text', '')
            blocks = result.get('blocks', [])
            
            print(f"\n✅ SUCCESS!")
            print(f"📊 Extracted {len(blocks)} text blocks")
            print(f"📝 Total characters: {len(extracted_text)}")
            
            # Save to file
            with open('ocr_result_paddle_direct.txt', 'w') as f:
                f.write(extracted_text)
            print(f"💾 Saved to ocr_result_paddle_direct.txt")
            
            # Show first 20 lines
            lines = extracted_text.strip().split('\n')
            print(f"\n📋 First 20 lines:")
            print("-" * 60)
            for i, line in enumerate(lines[:20], 1):
                print(f"  {i:2d}. {line}")
            print("-" * 60)
            
            # Show last 20 lines
            print(f"\n📋 Last 20 lines:")
            print("-" * 60)
            for i, line in enumerate(lines[-20:], len(lines)-19):
                print(f"  {i:2d}. {line}")
            print("-" * 60)
            
        else:
            print(f"❌ Error: HTTP {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "="*60)
    print("✅ TEST COMPLETE")
    print("="*60)

if __name__ == "__main__":
    test_paddle_ocr()

