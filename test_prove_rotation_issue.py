#!/usr/bin/env python3
"""
Test to prove that IMG_0372.heic is rotated and auto-rotation didn't work.
This test will:
1. Upload the HEIC file
2. Capture the preview image
3. Analyze if text is rotated
4. Check if auto-rotation logs appeared
5. Prove the issue
"""

import os
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import Select
import base64

def main():
    # Path to HEIC file
    heic_path = os.path.expanduser("~/Downloads/IMG_0372.heic")
    
    if not os.path.exists(heic_path):
        print(f"❌ HEIC file not found: {heic_path}")
        return
    
    file_size_mb = os.path.getsize(heic_path) / (1024 * 1024)
    print(f"✅ Found HEIC file: {heic_path}")
    print(f"📊 File size: {file_size_mb:.2f} MB")
    
    # Setup Chrome with console logging
    chrome_options = Options()
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})

    driver = webdriver.Chrome(options=chrome_options)

    # Store console logs
    console_logs = []
    
    try:
        # Open app
        print("\n🌐 Opening http://localhost:3000...")
        driver.get("http://localhost:3000")
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        print("✅ App loaded")
        
        # Upload HEIC file
        print("\n📁 Uploading HEIC file...")
        file_input = driver.find_element(By.CSS_SELECTOR, "input[type='file']")
        file_input.send_keys(heic_path)
        print("✅ File uploaded")
        
        # Wait for HEIC conversion
        print("\n⏳ Waiting for HEIC conversion...")
        time.sleep(5)  # Give it time to convert
        
        # Capture the preview image
        print("\n📸 Capturing preview image...")
        try:
            # Find the canvas or img element showing the preview
            preview_element = driver.find_element(By.CSS_SELECTOR, "canvas, img[alt*='preview'], img[src^='data:image']")
            
            # Get the image dimensions
            width = driver.execute_script("return arguments[0].naturalWidth || arguments[0].width;", preview_element)
            height = driver.execute_script("return arguments[0].naturalHeight || arguments[0].height;", preview_element)
            
            print(f"📐 Preview dimensions: {width}x{height}")
            
            # Check if image is rotated (width < height suggests portrait/rotated)
            if width < height:
                print(f"⚠️ IMAGE APPEARS ROTATED: width ({width}) < height ({height})")
                print(f"   Aspect ratio: {width/height:.2f} (portrait orientation)")
            else:
                print(f"✅ Image appears upright: width ({width}) > height ({height})")
                print(f"   Aspect ratio: {width/height:.2f} (landscape orientation)")
                
        except Exception as e:
            print(f"⚠️ Could not capture preview: {e}")
        
        # Now trigger OCR to see if auto-rotation runs
        print("\n🚀 Triggering OCR extraction to test auto-rotation...")

        # Click Process tab
        try:
            process_tab = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'Process')]"))
            )
            process_tab.click()
            print("✅ Clicked Process tab")
            time.sleep(1)
        except Exception as e:
            print(f"⚠️ Could not click Process tab: {e}")

        # Select PaddleOCR
        try:
            select_element = driver.find_element(By.CSS_SELECTOR, "select")
            select = Select(select_element)
            select.select_by_visible_text("PaddleOCR (Docker/Local)")
            print("✅ Selected PaddleOCR")
            time.sleep(0.5)
        except Exception as e:
            print(f"⚠️ Could not select PaddleOCR: {e}")

        # Click Start Extraction
        try:
            extract_button = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Start Extraction')]"))
            )
            extract_button.click()
            print("✅ Clicked Start Extraction")

            # Wait for auto-rotation to complete (Tesseract.js can take 30-60 seconds)
            print("⏳ Waiting 60 seconds for auto-rotation and OCR to complete...")
            time.sleep(60)

        except Exception as e:
            print(f"⚠️ Could not click Start Extraction: {e}")

        # Check browser console logs AFTER OCR
        print("\n📋 Checking browser console logs AFTER OCR...")
        try:
            logs = driver.get_log('browser')
            rotation_found = False
            error_found = False
            print(f"  Total console entries: {len(logs)}")
            for entry in logs:
                msg = entry.get('message', '')
                level = entry.get('level', '')

                # Print all messages
                if any(keyword in msg for keyword in ['rotation', 'orientation', 'AUTO-DETECTING', 'Tesseract', 'PaddleOCR', 'DEBUG', 'ERROR', 'SEVERE']):
                    print(f"  [{level}] {msg}")
                    if any(keyword in msg for keyword in ['rotation', 'orientation', 'AUTO-DETECTING']):
                        rotation_found = True
                    if level in ['ERROR', 'SEVERE']:
                        error_found = True

            if error_found:
                print("  ⚠️ ERRORS DETECTED IN CONSOLE!")
            if not rotation_found:
                print("  ❌ NO ROTATION-RELATED LOGS FOUND!")
            else:
                print("  ✅ Found rotation logs")
        except Exception as e:
            print(f"⚠️ Could not read console logs: {e}")

        # Try to read the UI logs
        print("\n📋 Checking UI log panel...")
        try:
            # Click on the Logs tab if it exists
            try:
                logs_tab = driver.find_element(By.XPATH, "//*[contains(text(), 'Logs') or contains(text(), 'Log')]")
                logs_tab.click()
                time.sleep(1)
                print("✅ Clicked Logs tab")
            except:
                print("⚠️ No Logs tab found")

            # Try to find log content
            log_elements = driver.find_elements(By.CSS_SELECTOR, "div[class*='log'], pre, .log-entry, [class*='console']")
            if log_elements:
                print(f"✅ Found {len(log_elements)} log elements")
                for i, elem in enumerate(log_elements[:20]):  # First 20
                    text = elem.text.strip()
                    if text and any(keyword in text.lower() for keyword in ['rotation', 'orientation', 'analyzing', 'tesseract', 'auto-detect']):
                        print(f"  📝 Log {i+1}: {text[:100]}")
            else:
                print("⚠️ No log elements found in UI")
        except Exception as e:
            print(f"⚠️ Could not read UI logs: {e}")

        # Take final screenshot
        driver.save_screenshot("prove-rotation-issue.png")
        print("\n📸 Screenshot saved: prove-rotation-issue.png")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        driver.save_screenshot("prove-rotation-error.png")
        print("📸 Error screenshot saved: prove-rotation-error.png")
    finally:
        print("\n🔚 Closing browser...")
        driver.quit()

if __name__ == "__main__":
    main()

