#!/usr/bin/env python3
"""
Test PaddleOCR with live Docker log streaming
"""

import base64
import requests
import json
import subprocess
import threading
import time
from PIL import Image

# Test configuration
IMAGE_PATH = "./sent-to-ocr-selenium.jpg"
PADDLE_URL = "http://localhost:5000/ocr"

def stream_docker_logs():
    """Stream Docker logs in real-time"""
    proc = subprocess.Popen(
        ['docker', 'logs', '-f', 'paddleocr-server'],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    for line in proc.stdout:
        print(f"[DOCKER] {line.rstrip()}")
    
    proc.wait()

def test_with_logs():
    print("\n" + "="*60)
    print("🔍 PADDLEOCR TEST WITH LIVE LOGS")
    print("="*60)
    
    # Start log streaming in background
    log_thread = threading.Thread(target=stream_docker_logs, daemon=True)
    log_thread.start()
    
    # Wait a moment for log streaming to start
    time.sleep(2)
    
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
    print("="*60)
    
    payload = {
        "image": base64_data,
        "filename": IMAGE_PATH.split('/')[-1]
    }
    
    try:
        response = requests.post(PADDLE_URL, json=payload, timeout=120)
        
        if response.status_code == 200:
            result = response.json()
            
            extracted_text = result.get('text', '')
            blocks = result.get('blocks', [])
            
            print("="*60)
            print(f"\n✅ SUCCESS!")
            print(f"📊 Extracted {len(blocks)} text blocks")
            print(f"📝 Total characters: {len(extracted_text)}")
            
            # Save to file
            with open('ocr_result_with_logs.txt', 'w') as f:
                f.write(extracted_text)
            print(f"💾 Saved to ocr_result_with_logs.txt")
            
            # Show first 30 lines
            lines = extracted_text.strip().split('\n')
            print(f"\n📋 First 30 lines:")
            print("-" * 60)
            for i, line in enumerate(lines[:30], 1):
                print(f"  {i:2d}. {line}")
            print("-" * 60)
            
        else:
            print(f"❌ Error: HTTP {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    # Wait a moment for final logs
    time.sleep(2)
    
    print("\n" + "="*60)
    print("✅ TEST COMPLETE")
    print("="*60)

if __name__ == "__main__":
    test_with_logs()

