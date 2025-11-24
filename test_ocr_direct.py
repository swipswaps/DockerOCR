#!/usr/bin/env python3
"""
Direct test of PaddleOCR table detection
"""
import base64
import requests
import json

# Read the image file
with open('sent-to-ocr-selenium.jpg', 'rb') as f:
    image_data = f.read()

# Convert to base64 (just the data, no data URL prefix)
base64_image = base64.b64encode(image_data).decode('utf-8')

# Send to OCR endpoint
print("📤 Sending image to PaddleOCR...")
response = requests.post(
    'http://localhost:5000/ocr',
    json={
        'image': base64_image,
        'filename': 'test.jpg'
    }
)

if response.status_code == 200:
    result = response.json()
    print(f"\n✅ OCR successful!")
    print(f"📊 Extracted {len(result.get('blocks', []))} text blocks")
    print(f"\n📄 Extracted text (first 500 chars):")
    print("-" * 60)
    text = result.get('text', '')
    print(text[:500] + "..." if len(text) > 500 else text)
    print("-" * 60)
    
    # Save full text
    with open('ocr_result_direct.txt', 'w') as f:
        f.write(text)
    print("\n✅ Saved full text to ocr_result_direct.txt")
else:
    print(f"\n❌ OCR failed with status {response.status_code}")
    print(response.text)

print("\n💡 Check Docker logs for table detection details:")
print("   docker logs paddleocr-server | tail -50")

