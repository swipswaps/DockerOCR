#!/usr/bin/env python3
"""
Test HEIC upload with auto-rotation detection using Selenium
"""

import time
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

# Configuration
APP_URL = "http://localhost:3001"
HEIC_FILE = os.path.expanduser("~/Downloads/IMG_0372.heic")

def main():
    # Check if HEIC file exists
    if not os.path.exists(HEIC_FILE):
        print(f"❌ HEIC file not found: {HEIC_FILE}")
        return
    
    file_size_mb = os.path.getsize(HEIC_FILE) / 1024 / 1024
    print(f"✅ Found HEIC file: {HEIC_FILE}")
    print(f"📊 File size: {file_size_mb:.2f} MB")
    
    # Setup Chrome options
    chrome_options = Options()
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    # chrome_options.add_argument('--headless')  # Comment out to see browser
    
    driver = webdriver.Chrome(options=chrome_options)
    driver.set_window_size(1920, 1080)
    
    try:
        print(f"\n🌐 Opening {APP_URL}...")
        driver.get(APP_URL)
        
        # Wait for app to load
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'DockerOCR')]"))
        )
        print("✅ App loaded")

        # Upload HEIC file
        print(f"\n📁 Uploading HEIC file...")
        file_input = driver.find_element(By.CSS_SELECTOR, "input[type='file']")
        file_input.send_keys(HEIC_FILE)
        print("✅ File uploaded")
        
        # Wait for HEIC conversion
        print("\n⏳ Waiting for HEIC conversion...")
        try:
            # Wait for the success message
            WebDriverWait(driver, 30).until(
                EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'conversion complete') or contains(text(), 'Preview and filters enabled')]"))
            )
            print("✅ HEIC conversion complete")
        except Exception as e:
            print(f"⚠️ Timeout waiting for HEIC conversion message")
            # Take screenshot to see what's on screen
            driver.save_screenshot("heic-conversion-timeout.png")
            print("📸 Screenshot saved: heic-conversion-timeout.png")
            # Try to continue anyway
            time.sleep(2)

        # Click the Process tab to reveal the dropdown and extraction button
        print("\n🔧 Clicking Process tab...")
        try:
            process_tab = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'Process') or contains(@title, 'Process')]"))
            )
            process_tab.click()
            print("✅ Process tab clicked")
            time.sleep(1)
        except Exception as e:
            print(f"⚠️ Could not find Process tab: {e}")
            # Try alternative selectors
            try:
                process_tab = driver.find_element(By.XPATH, "//button[contains(., 'Process')]")
                process_tab.click()
                print("✅ Process tab clicked (alternative selector)")
                time.sleep(1)
            except:
                print("⚠️ Could not click Process tab - continuing anyway")

        # Select PaddleOCR from dropdown
        print("\n🔧 Selecting PaddleOCR from dropdown...")
        try:
            # Look for the dropdown/select element
            paddle_option = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.XPATH, "//select//option[contains(text(), 'PaddleOCR')]"))
            )
            paddle_option.click()
            print("✅ PaddleOCR selected from dropdown")
            time.sleep(0.5)
        except Exception as e:
            print(f"⚠️ Could not select PaddleOCR from dropdown: {e}")
            # Try selecting via the select element
            try:
                select_element = driver.find_element(By.CSS_SELECTOR, "select")
                from selenium.webdriver.support.ui import Select
                select = Select(select_element)
                select.select_by_visible_text("PaddleOCR (Docker/Local)")
                print("✅ PaddleOCR selected via Select element")
                time.sleep(0.5)
            except Exception as e2:
                print(f"⚠️ Could not select PaddleOCR: {e2}")

        # Check auto-rotation toggle status
        print("\n🔍 Checking auto-rotation toggle...")
        try:
            # Look for the toggle button
            toggle_elements = driver.find_elements(By.XPATH, "//*[contains(text(), 'Auto-Detect Rotation')]")
            if toggle_elements:
                print("✅ Auto-rotation toggle found")

                # Check if toggle is enabled (green background)
                toggle_button = driver.find_element(By.CSS_SELECTOR, "button.bg-emerald-600, button.bg-gray-600")
                classes = toggle_button.get_attribute("class")

                if "bg-emerald-600" in classes:
                    print("✅ Auto-rotation is ENABLED (green)")
                else:
                    print("⚠️ Auto-rotation is DISABLED (gray) - enabling it...")
                    toggle_button.click()
                    time.sleep(0.5)
                    print("✅ Auto-rotation enabled")
            else:
                print("⚠️ Auto-rotation toggle not visible (might be using Gemini)")
        except Exception as e:
            print(f"⚠️ Could not check auto-rotation toggle: {e}")
        
        # Start extraction
        print("\n🚀 Starting OCR extraction...")
        time.sleep(1)  # Wait for UI to settle

        # Try multiple selectors for the extraction button
        extract_button = None
        selectors = [
            "//button[contains(., 'Start Extraction')]",
            "//button[contains(text(), 'Start Extraction')]",
            "//button//span[contains(text(), 'Start Extraction')]/..",
            "button:has-text('Start Extraction')"
        ]

        for selector in selectors:
            try:
                if selector.startswith("//"):
                    extract_button = WebDriverWait(driver, 5).until(
                        EC.element_to_be_clickable((By.XPATH, selector))
                    )
                else:
                    extract_button = WebDriverWait(driver, 5).until(
                        EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                    )
                print(f"✅ Found extraction button with selector: {selector}")
                break
            except:
                continue

        if not extract_button:
            print("❌ Could not find extraction button - taking screenshot")
            driver.save_screenshot("cannot-find-button.png")
            # Try to find any button and print them
            buttons = driver.find_elements(By.TAG_NAME, "button")
            print(f"Found {len(buttons)} buttons on page:")
            for i, btn in enumerate(buttons[:10]):  # Print first 10
                print(f"  {i+1}. {btn.text[:50] if btn.text else '(no text)'}")
            raise Exception("Could not find Start Extraction button")

        extract_button.click()
        print("✅ Clicked 'Start Extraction'")
        
        # Monitor logs in real-time
        print("\n📋 MONITORING LOGS:")
        print("═" * 80)
        
        last_log_count = 0
        rotation_logs = []
        all_logs = []
        start_time = time.time()
        max_wait = 120  # 2 minutes max
        
        while time.time() - start_time < max_wait:
            # Find all log entries
            log_elements = driver.find_elements(By.CSS_SELECTOR, ".log-entry, [class*='log'], pre")
            
            # Print new logs
            if len(log_elements) > last_log_count:
                for i in range(last_log_count, len(log_elements)):
                    log_text = log_elements[i].text.strip()
                    if log_text and log_text not in all_logs:
                        print(log_text)
                        all_logs.append(log_text)
                        
                        # Track rotation-related logs
                        if any(keyword in log_text.lower() for keyword in ['rotation', 'analyzing orientation', 'detected rotation']):
                            rotation_logs.append(log_text)
                
                last_log_count = len(log_elements)
            
            # Check if extraction completed
            try:
                success_element = driver.find_element(By.XPATH, "//*[contains(text(), 'Extraction successful') or contains(text(), 'extraction successful')]")
                if success_element:
                    print("\n✅ EXTRACTION COMPLETED SUCCESSFULLY")
                    break
            except:
                pass
            
            # Check for errors
            try:
                error_element = driver.find_element(By.XPATH, "//*[contains(text(), 'ERROR') or contains(text(), 'Error') or contains(text(), 'error')]")
                if error_element and 'could not execute a primitive' in error_element.text:
                    print(f"\n❌ EXTRACTION FAILED: {error_element.text}")
                    break
            except:
                pass
            
            time.sleep(0.5)
        
        print("═" * 80)
        
        # Analyze rotation logs
        print("\n📊 ROTATION LOG ANALYSIS:")
        print("─" * 80)
        if rotation_logs:
            print(f"Found {len(rotation_logs)} rotation-related log entries:")
            for log in rotation_logs:
                print(f"  • {log}")
            
            # Check for duplicates
            duplicates = [log for log in rotation_logs if rotation_logs.count(log) > 1]
            unique_duplicates = list(set(duplicates))
            
            if unique_duplicates:
                print(f"\n⚠️ FOUND {len(unique_duplicates)} DUPLICATE LOG MESSAGES:")
                for dup in unique_duplicates:
                    count = rotation_logs.count(dup)
                    print(f"  • '{dup}' appeared {count} times")
            else:
                print("\n✅ No duplicate logs found!")
        else:
            print("⚠️ No rotation-related logs found")
        
        print("─" * 80)
        
        # Take screenshot
        screenshot_path = "test-heic-auto-rotation-selenium.png"
        driver.save_screenshot(screenshot_path)
        print(f"\n📸 Screenshot saved: {screenshot_path}")
        
        # Wait a bit to see final state
        time.sleep(2)
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        
        # Save error screenshot
        try:
            driver.save_screenshot("test-heic-auto-rotation-error.png")
            print("📸 Error screenshot saved: test-heic-auto-rotation-error.png")
        except:
            pass
    
    finally:
        print("\n🔚 Closing browser...")
        driver.quit()

if __name__ == "__main__":
    main()

