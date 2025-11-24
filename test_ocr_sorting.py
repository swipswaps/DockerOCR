#!/usr/bin/env python3
"""
Selenium test to verify OCR extraction with official PaddleOCR sorting algorithm
"""

import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import os

# Test configuration
HEIC_FILE_PATH = "/home/owner/Downloads/IMG_0372.heic"
APP_URL = "http://localhost:3000"

def test_ocr_sorting():
    """Test OCR extraction with official PaddleOCR sorting algorithm"""
    
    # Setup Chrome options
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    
    driver = webdriver.Chrome(options=chrome_options)
    
    try:
        print("\n" + "="*60)
        print("🔍 OCR SORTING TEST - Official PaddleOCR Algorithm")
        print("="*60)
        
        driver.get(APP_URL)
        print("✅ Navigated to app")
        time.sleep(2)
        
        # Upload HEIC file
        file_input = driver.find_element(By.CSS_SELECTOR, 'input[type="file"]')
        file_input.send_keys(HEIC_FILE_PATH)
        print("✅ Uploaded HEIC file")
        
        # Wait for HEIC conversion
        print("⏳ Waiting for HEIC conversion...")
        time.sleep(4)
        
        # Switch to Process tab
        process_tab = driver.find_element(By.XPATH, '//button[.//span[text()="Process"]]')
        process_tab.click()
        print("✅ Switched to Process tab")
        time.sleep(1)
        
        # Test 1: Extract without rotation
        print("\n" + "-"*60)
        print("TEST 1: OCR Extraction WITHOUT Rotation")
        print("-"*60)
        
        extract_btn = driver.find_element(By.XPATH, '//button[.//span[text()="Start Extraction"]]')
        extract_btn.click()
        print("🚀 Started OCR extraction")
        
        # Wait for extraction to complete
        print("⏳ Waiting for extraction...")
        time.sleep(15)
        
        # Get extracted text from textarea
        extracted_text_no_rotation = driver.execute_script("""
            const textarea = document.querySelector('textarea');
            return textarea ? textarea.value : null;
        """)
        
        if extracted_text_no_rotation:
            print(f"\n📝 Extracted {len(extracted_text_no_rotation)} characters")
            print("First 500 characters:")
            print("-" * 60)
            print(extracted_text_no_rotation[:500])
            print("-" * 60)
            
            # Save to file
            with open('ocr_result_no_rotation.txt', 'w') as f:
                f.write(extracted_text_no_rotation)
            print("💾 Saved to ocr_result_no_rotation.txt")
            
            # Analyze text structure
            lines = extracted_text_no_rotation.strip().split('\n')
            print(f"\n📊 Total lines extracted: {len(lines)}")
            print("\nFirst 15 lines:")
            for i, line in enumerate(lines[:15], 1):
                print(f"  {i:2d}. {line}")
        else:
            print("❌ No text extracted (no rotation)")
        
        # Test 2: Extract with rotation
        print("\n" + "-"*60)
        print("TEST 2: OCR Extraction WITH Rotation (270°)")
        print("-"*60)
        
        # Switch back to Edit tab
        edit_tab = driver.find_element(By.XPATH, '//button[.//span[text()="Edit"]]')
        edit_tab.click()
        print("✅ Switched to Edit tab")
        time.sleep(1)
        
        # Click rotate left button
        rotate_left_btn = driver.find_element(By.CSS_SELECTOR, 'button[title*="Rotate Left"]')
        rotate_left_btn.click()
        print("✅ Rotated 270°")
        time.sleep(1)
        
        # Switch back to Process tab
        process_tab = driver.find_element(By.XPATH, '//button[.//span[text()="Process"]]')
        process_tab.click()
        print("✅ Switched to Process tab")
        time.sleep(1)
        
        # Click extract button again
        extract_btn = driver.find_element(By.XPATH, '//button[.//span[text()="Start Extraction"]]')
        extract_btn.click()
        print("🚀 Started OCR extraction")
        
        # Wait for extraction to complete
        print("⏳ Waiting for extraction...")
        time.sleep(15)
        
        # Get extracted text
        extracted_text_with_rotation = driver.execute_script("""
            const textarea = document.querySelector('textarea');
            return textarea ? textarea.value : null;
        """)
        
        if extracted_text_with_rotation:
            print(f"\n📝 Extracted {len(extracted_text_with_rotation)} characters")
            print("First 500 characters:")
            print("-" * 60)
            print(extracted_text_with_rotation[:500])
            print("-" * 60)
            
            # Save to file
            with open('ocr_result_with_rotation.txt', 'w') as f:
                f.write(extracted_text_with_rotation)
            print("💾 Saved to ocr_result_with_rotation.txt")
            
            # Analyze text structure
            lines = extracted_text_with_rotation.strip().split('\n')
            print(f"\n📊 Total lines extracted: {len(lines)}")
            print("\nFirst 15 lines:")
            for i, line in enumerate(lines[:15], 1):
                print(f"  {i:2d}. {line}")
        else:
            print("❌ No text extracted (with rotation)")
        
        print("\n" + "="*60)
        print("✅ TEST COMPLETE")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        driver.quit()

if __name__ == "__main__":
    if not os.path.exists(HEIC_FILE_PATH):
        print(f"❌ HEIC file not found: {HEIC_FILE_PATH}")
        exit(1)
    
    test_ocr_sorting()

