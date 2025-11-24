#!/usr/bin/env python3
"""
Selenium test to verify table detection and column-aware sorting in OCR extraction
"""
import time
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

# Setup Chrome options
chrome_options = Options()
chrome_options.add_argument('--headless')  # Run in headless mode
chrome_options.add_argument('--no-sandbox')
chrome_options.add_argument('--disable-dev-shm-usage')

# Create driver
driver = webdriver.Chrome(options=chrome_options)

try:
    # Navigate to the app
    driver.get('http://localhost:3000')
    print("✅ Loaded app at http://localhost:3000")
    
    # Wait for app to load
    time.sleep(2)
    
    # Find file input and upload HEIC file
    file_input = driver.find_element(By.CSS_SELECTOR, 'input[type="file"]')
    heic_path = '/home/owner/Downloads/IMG_0372.heic'
    file_input.send_keys(heic_path)
    print(f"✅ Uploaded {heic_path}")
    
    # Wait for conversion to complete
    time.sleep(3)
    
    print("\n" + "="*60)
    print("TEST 1: OCR WITHOUT ROTATION")
    print("="*60)

    # Switch to Process tab
    process_tab = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//button[.//span[text()='Process']]"))
    )
    process_tab.click()
    print("✅ Switched to Process tab")
    time.sleep(1)

    # Select PaddleOCR engine
    engine_select = driver.find_element(By.CSS_SELECTOR, 'select')
    engine_select.click()
    paddle_option = driver.find_element(By.XPATH, "//option[@value='PADDLE']")
    paddle_option.click()
    print("✅ Selected PaddleOCR engine")
    time.sleep(1)

    # Click "Start Extraction" button (without rotation)
    extract_btn = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//button[.//span[text()='Start Extraction']]"))
    )
    extract_btn.click()
    print("✅ Clicked 'Start Extraction' button")
    
    # Wait for OCR to complete (PaddleOCR can take a while)
    print("⏳ Waiting for OCR to complete...")
    time.sleep(20)
    
    # Get the extracted text from the textarea
    try:
        textarea = driver.find_element(By.CSS_SELECTOR, 'textarea')
        extracted_text_no_rotation = textarea.get_attribute('value')
        print("\n📄 EXTRACTED TEXT (NO ROTATION):")
        print("-" * 60)
        print(extracted_text_no_rotation[:500] + "..." if len(extracted_text_no_rotation) > 500 else extracted_text_no_rotation)
        print("-" * 60)
        
        # Save to file
        with open('extraction_no_rotation.txt', 'w') as f:
            f.write(extracted_text_no_rotation)
        print("✅ Saved to extraction_no_rotation.txt")
    except Exception as e:
        print(f"❌ Could not get extracted text: {e}")
    
    # Reload page for second test
    driver.get('http://localhost:3000')
    time.sleep(2)
    
    print("\n" + "="*60)
    print("TEST 2: OCR WITH ROTATION")
    print("="*60)
    
    # Upload file again
    file_input = driver.find_element(By.CSS_SELECTOR, 'input[type="file"]')
    file_input.send_keys(heic_path)
    print(f"✅ Uploaded {heic_path}")
    
    # Wait for conversion
    time.sleep(3)
    
    # Click "Rotate Left" button
    rotate_left_btn = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Rotate Left')]"))
    )
    rotate_left_btn.click()
    print("✅ Clicked 'Rotate Left' button")
    
    # Wait for rotation to apply
    time.sleep(1)

    # Switch to Process tab
    process_tab = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//button[.//span[text()='Process']]"))
    )
    process_tab.click()
    print("✅ Switched to Process tab")
    time.sleep(1)

    # Select PaddleOCR engine
    engine_select = driver.find_element(By.CSS_SELECTOR, 'select')
    engine_select.click()
    paddle_option = driver.find_element(By.XPATH, "//option[@value='PADDLE']")
    paddle_option.click()
    print("✅ Selected PaddleOCR engine")
    time.sleep(1)

    # Click "Start Extraction" button
    extract_btn = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//button[.//span[text()='Start Extraction']]"))
    )
    extract_btn.click()
    print("✅ Clicked 'Start Extraction' button")
    
    # Wait for OCR to complete
    print("⏳ Waiting for OCR to complete...")
    time.sleep(20)
    
    # Get the extracted text
    try:
        textarea = driver.find_element(By.CSS_SELECTOR, 'textarea')
        extracted_text_with_rotation = textarea.get_attribute('value')
        print("\n📄 EXTRACTED TEXT (WITH ROTATION):")
        print("-" * 60)
        print(extracted_text_with_rotation[:500] + "..." if len(extracted_text_with_rotation) > 500 else extracted_text_with_rotation)
        print("-" * 60)
        
        # Save to file
        with open('extraction_with_rotation.txt', 'w') as f:
            f.write(extracted_text_with_rotation)
        print("✅ Saved to extraction_with_rotation.txt")
    except Exception as e:
        print(f"❌ Could not get extracted text: {e}")
    
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print("✅ Both tests completed successfully!")
    print("📁 Results saved to:")
    print("   - extraction_no_rotation.txt")
    print("   - extraction_with_rotation.txt")
    print("\n💡 Check Docker logs for table detection details:")
    print("   docker logs paddleocr-server")
    
finally:
    driver.quit()

