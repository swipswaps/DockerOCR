#!/usr/bin/env python3
"""
Selenium test to verify rotation is applied before OCR extraction
"""

import time
import base64
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from PIL import Image
import io

def test_rotation_extraction():
    print("\n" + "="*60)
    print("🔄 SELENIUM ROTATION + OCR EXTRACTION TEST")
    print("="*60)
    
    # Setup Chrome options
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    
    # Set download preferences
    prefs = {
        "download.default_directory": os.getcwd(),
        "download.prompt_for_download": False,
    }
    chrome_options.add_experimental_option("prefs", prefs)
    
    driver = webdriver.Chrome(options=chrome_options)
    
    try:
        # Navigate to app
        driver.get('http://localhost:3001/')
        print("✅ Navigated to app")
        
        # Wait for app to load
        time.sleep(2)
        
        # Upload HEIC file
        heic_path = '/home/owner/Downloads/IMG_0372.heic'
        file_input = driver.find_element(By.CSS_SELECTOR, 'input[type="file"]')
        file_input.send_keys(heic_path)
        print("✅ Uploaded HEIC file")
        
        # Wait for HEIC conversion
        print("⏳ Waiting for HEIC conversion...")
        time.sleep(4)
        
        # Click rotate left button
        rotate_left_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, 'button[title*="Rotate Left"]'))
        )
        rotate_left_btn.click()
        print("✅ Clicked Rotate Left (270°)")
        
        time.sleep(1)
        
        # Check filter state
        filter_state = driver.execute_script("return window.__currentFilters || 'not available';")
        print(f"📊 Filter state: {filter_state}")
        
        # Switch to Process tab (look for button with "Process" span inside)
        process_tab = driver.find_element(By.XPATH, '//button[.//span[text()="Process"]]')
        process_tab.click()
        print("✅ Switched to Process tab")
        
        time.sleep(1)
        
        # Click Start Extraction
        extract_btn = driver.find_element(By.XPATH, '//button[.//span[text()="Start Extraction"]]')
        extract_btn.click()
        print("🚀 Started OCR extraction")
        
        # Wait for extraction to complete
        print("⏳ Waiting for extraction...")
        time.sleep(8)
        
        # Get the image sent to OCR
        sent_to_ocr = driver.execute_script("return window.__sentToOCR;")
        
        if sent_to_ocr:
            print("✅ Found image in window.__sentToOCR")
            
            # Decode base64 image
            base64_data = sent_to_ocr.split(',')[1]
            image_data = base64.b64decode(base64_data)
            
            # Save the image
            with open('sent-to-ocr-selenium.jpg', 'wb') as f:
                f.write(image_data)
            print("✅ Saved sent-to-ocr-selenium.jpg")
            
            # Get image dimensions using PIL
            img = Image.open(io.BytesIO(image_data))
            width, height = img.size
            print(f"📏 Image dimensions: {width}x{height}")
            
            # Determine orientation
            if width > height:
                orientation = "LANDSCAPE (rotated)"
            else:
                orientation = "PORTRAIT (not rotated)"
            
            print(f"📐 Orientation: {orientation}")
            
            # Check if rotation was applied
            if width > height:
                print("\n✅ SUCCESS: Rotation WAS applied (image is landscape)")
            else:
                print("\n❌ FAILURE: Rotation was NOT applied (image is still portrait)")
                
        else:
            print("❌ No image found in window.__sentToOCR")
        
        # Get app messages
        log_elements = driver.find_elements(By.CSS_SELECTOR, '.text-xs.font-mono')
        messages = [el.text.strip() for el in log_elements if el.text.strip()]
        
        print("\n📋 APP MESSAGES:")
        print("-" * 60)
        for msg in messages[-20:]:  # Last 20 messages
            print(f"  {msg}")
        print("-" * 60)
        
        # Check if rotation was mentioned in logs
        rotation_mentioned = any('270' in msg or 'rotation=270' in msg for msg in messages)
        print(f"\n🔄 Rotation mentioned in logs: {rotation_mentioned}")
        
    finally:
        driver.quit()
        print("\n" + "="*60)
        print("✅ TEST COMPLETE")
        print("="*60 + "\n")

if __name__ == '__main__':
    test_rotation_extraction()

