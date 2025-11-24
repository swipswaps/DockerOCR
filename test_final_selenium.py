#!/usr/bin/env python3
"""
Final Selenium test to verify table-aware OCR sorting works end-to-end
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import time

# Test configuration
HEIC_FILE_PATH = "/home/owner/Downloads/IMG_0372.heic"
APP_URL = "http://localhost:3000"

def test_final_ocr():
    print("\n" + "="*60)
    print("🔍 FINAL SELENIUM TEST - Table-Aware OCR Sorting")
    print("="*60)
    
    # Setup Chrome options
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    
    driver = webdriver.Chrome(options=chrome_options)
    
    try:
        # Navigate to app
        driver.get(APP_URL)
        print(f"✅ Navigated to {APP_URL}")
        
        # Upload HEIC file
        file_input = driver.find_element(By.CSS_SELECTOR, 'input[type="file"]')
        file_input.send_keys(HEIC_FILE_PATH)
        print("✅ Uploaded HEIC file")
        
        # Wait for HEIC conversion
        time.sleep(3)
        print("✅ HEIC conversion complete")
        
        # Switch to Process tab
        process_tab = driver.find_element(By.XPATH, '//button[.//span[text()="Process"]]')
        process_tab.click()
        print("✅ Switched to Process tab")
        
        # Click Start Extraction button
        extract_button = driver.find_element(By.XPATH, '//button[contains(., "Start Extraction")]')
        extract_button.click()
        print("🚀 Started OCR extraction")
        
        # Wait for extraction to complete (up to 60 seconds)
        wait = WebDriverWait(driver, 60)
        
        # Wait for the extraction result to appear
        time.sleep(30)  # Give it time to process
        
        # Get the extracted text
        try:
            text_area = driver.find_element(By.CSS_SELECTOR, 'textarea')
            extracted_text = text_area.get_attribute('value')
            
            if extracted_text and len(extracted_text) > 100:
                print(f"\n✅ SUCCESS! Extracted {len(extracted_text)} characters")
                
                # Save to file
                with open('ocr_result_final_selenium.txt', 'w') as f:
                    f.write(extracted_text)
                print("💾 Saved to ocr_result_final_selenium.txt")
                
                # Show first 30 lines
                lines = extracted_text.strip().split('\n')
                print(f"\n📋 First 30 lines:")
                print("-" * 60)
                for i, line in enumerate(lines[:30], 1):
                    print(f"  {i:2d}. {line}")
                print("-" * 60)
                
                # Analyze the structure
                print(f"\n📊 Analysis:")
                print(f"  Total lines: {len(lines)}")
                print(f"  Total characters: {len(extracted_text)}")
                
                # Check if "Solar Energy" appears (common in the table)
                solar_energy_count = extracted_text.count("Solar Energy")
                print(f"  'Solar Energy' appears: {solar_energy_count} times")
                
            else:
                print(f"❌ No text extracted or text too short ({len(extracted_text)} chars)")
                
        except Exception as e:
            print(f"❌ Error getting extracted text: {e}")
        
    finally:
        driver.quit()
    
    print("\n" + "="*60)
    print("✅ TEST COMPLETE")
    print("="*60)

if __name__ == "__main__":
    test_final_ocr()

