#!/usr/bin/env python3
"""
Test to verify if IMG_0372.heic text is actually rotated.
This will:
1. Upload the image
2. Run PaddleOCR extraction
3. Analyze the extracted text to see if it's readable
4. Check text block orientations
5. Prove whether rotation is needed
"""

import os
import time
import json
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import Select

def main():
    heic_path = os.path.expanduser("~/Downloads/IMG_0372.heic")
    
    if not os.path.exists(heic_path):
        print(f"❌ HEIC file not found: {heic_path}")
        return
    
    print(f"✅ Found HEIC file: {heic_path}")
    
    chrome_options = Options()
    chrome_options.add_argument("--window-size=1920,1080")
    driver = webdriver.Chrome(options=chrome_options)
    
    try:
        print("\n🌐 Opening http://localhost:3000...")
        driver.get("http://localhost:3000")
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        print("✅ App loaded")
        
        # Upload file
        print("\n📁 Uploading HEIC file...")
        file_input = driver.find_element(By.CSS_SELECTOR, "input[type='file']")
        file_input.send_keys(heic_path)
        print("✅ File uploaded")
        
        # Wait for HEIC conversion
        print("\n⏳ Waiting for HEIC conversion...")
        time.sleep(5)
        
        # Get preview image dimensions
        print("\n📸 Analyzing preview image...")
        try:
            preview_img = driver.find_element(By.CSS_SELECTOR, "img[alt='Preview'], canvas, img")
            width = driver.execute_script("return arguments[0].naturalWidth || arguments[0].width;", preview_img)
            height = driver.execute_script("return arguments[0].naturalHeight || arguments[0].height;", preview_img)
            print(f"📐 Preview dimensions: {width}x{height}")
            
            if width < height:
                print(f"⚠️ IMAGE IS PORTRAIT: width ({width}) < height ({height})")
                print(f"   This suggests the image might be rotated 90° or 270°")
            else:
                print(f"✅ IMAGE IS LANDSCAPE: width ({width}) > height ({height})")
        except Exception as e:
            print(f"⚠️ Could not get preview dimensions: {e}")
        
        # Click Process tab
        print("\n🔄 Switching to Process tab...")
        try:
            process_tab = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Process')]"))
            )
            process_tab.click()
            time.sleep(1)
            print("✅ Clicked Process tab")
        except Exception as e:
            print(f"⚠️ Could not click Process tab: {e}")
        
        # Select PaddleOCR
        print("\n🐼 Selecting PaddleOCR engine...")
        try:
            select_element = driver.find_element(By.CSS_SELECTOR, "select")
            select = Select(select_element)
            select.select_by_value("PADDLE")
            time.sleep(1)
            print("✅ Selected PaddleOCR")
        except Exception as e:
            print(f"⚠️ Could not select PaddleOCR: {e}")
        
        # Click Start Extraction
        print("\n🚀 Starting OCR extraction...")
        try:
            start_button = driver.find_element(By.XPATH, "//button[contains(., 'Start Extraction')]")
            start_button.click()
            print("✅ Clicked Start Extraction")
            
            # Wait for extraction to complete
            print("⏳ Waiting for OCR to complete (max 60s)...")
            WebDriverWait(driver, 60).until(
                EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Extraction successful') or contains(text(), 'extraction successful')]"))
            )
            print("✅ OCR extraction completed")
            
        except Exception as e:
            print(f"⚠️ Extraction issue: {e}")
        
        time.sleep(2)

        # Click Editor tab to see text overlay
        print("\n📝 Switching to Editor tab to analyze text blocks...")
        try:
            editor_tab = driver.find_element(By.XPATH, "//button[contains(., 'EDITOR') or contains(., 'Editor')]")
            editor_tab.click()
            time.sleep(2)
            print("✅ Clicked Editor tab")
        except Exception as e:
            print(f"⚠️ Could not click Editor tab: {e}")

        # Try to find text overlay elements or any visible OCR text
        print("\n📊 Extracting OCR text from page...")
        try:
            # Wait a bit for text overlay to render
            time.sleep(2)

            # Try multiple methods to get the text
            all_text = ""

            # Method 1: Look for text overlay divs
            text_overlays = driver.find_elements(By.CSS_SELECTOR, "[class*='text-overlay'], [class*='ocr-text'], [data-text]")
            if text_overlays:
                print(f"✅ Found {len(text_overlays)} text overlay elements")
                for elem in text_overlays[:20]:  # First 20
                    text = elem.text.strip() or elem.get_attribute('data-text') or ""
                    if text:
                        all_text += text + " "

            # Method 2: Look for any SVG text elements (if text is rendered as SVG)
            svg_texts = driver.find_elements(By.CSS_SELECTOR, "svg text, text")
            if svg_texts:
                print(f"✅ Found {len(svg_texts)} SVG text elements")
                for elem in svg_texts[:50]:  # First 50
                    text = elem.text.strip()
                    if text and len(text) > 1:
                        all_text += text + " "

            # Method 3: Get page source and look for text in data attributes
            page_source = driver.page_source
            if '"text"' in page_source:
                print("✅ Found text data in page source")
                # Try to extract JSON data
                import re
                text_matches = re.findall(r'"text"\s*:\s*"([^"]+)"', page_source)
                if text_matches:
                    print(f"✅ Extracted {len(text_matches)} text blocks from page source")
                    all_text = " ".join(text_matches[:100])  # First 100 blocks

            if all_text:
                print(f"\n📄 EXTRACTED TEXT (first 1000 chars):")
                print("=" * 80)
                print(all_text[:1000])
                print("=" * 80)

                # Check if text is readable
                print(f"\n🔍 Text Readability Analysis:")
                print(f"   Total text length: {len(all_text)}")

                # Check for common English words
                readable_words = ["the", "and", "of", "to", "a", "in", "is", "it", "you", "that", "for", "on", "with", "this", "at", "be", "by"]
                readable_count = sum(1 for word in readable_words if f" {word.lower()} " in f" {all_text.lower()} ")
                print(f"   Common English words found: {readable_count}/{len(readable_words)}")

                # Check for gibberish (lots of single characters or nonsense)
                words = all_text.split()
                if words:
                    single_chars = sum(1 for w in words if len(w) == 1)
                    print(f"   Single character 'words': {single_chars}/{len(words)} ({100*single_chars/max(len(words),1):.1f}%)")

                    # Check average word length
                    avg_word_len = sum(len(w) for w in words) / len(words)
                    print(f"   Average word length: {avg_word_len:.1f} chars")

                # VERDICT
                print("\n" + "=" * 80)
                if readable_count >= 5:
                    print("   ✅ TEXT IS READABLE - Image orientation appears correct")
                    print("   However, image is PORTRAIT (3024x4032) which suggests it may be rotated")
                else:
                    print("   ❌ TEXT IS UNREADABLE - Image is DEFINITELY ROTATED!")
                    print("   🔄 The image needs 90° or 270° rotation correction!")
                print("=" * 80)

            else:
                print("⚠️ Could not extract any OCR text from page")

        except Exception as e:
            print(f"⚠️ Could not analyze OCR data: {e}")
            import traceback
            traceback.print_exc()
        
        # Take screenshot
        driver.save_screenshot("verify-rotation.png")
        print("\n📸 Screenshot saved: verify-rotation.png")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        print("\n🔚 Closing browser...")
        driver.quit()

if __name__ == "__main__":
    main()

