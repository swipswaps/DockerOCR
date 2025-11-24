#!/usr/bin/env python3
"""
Capture screenshots for README.md documentation
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import time
import os

# Configuration
HEIC_FILE_PATH = "/home/owner/Downloads/IMG_0372.heic"
APP_URL = "http://localhost:3000"
SCREENSHOTS_DIR = "screenshots"

# Create screenshots directory
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

def setup_driver():
    """Setup Chrome driver with appropriate options"""
    chrome_options = Options()
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('--force-device-scale-factor=1')
    return webdriver.Chrome(options=chrome_options)

def capture_screenshots():
    print("\n" + "="*60)
    print("📸 CAPTURING SCREENSHOTS FOR README.md")
    print("="*60)
    
    driver = setup_driver()
    
    try:
        # 1. Main interface - empty state
        print("\n1️⃣ Capturing main interface (empty state)...")
        driver.get(APP_URL)
        time.sleep(2)
        driver.save_screenshot(f"{SCREENSHOTS_DIR}/01-main-interface.png")
        print("✅ Saved: 01-main-interface.png")
        
        # 2. File upload - Source tab
        print("\n2️⃣ Uploading file and capturing Source tab...")
        file_input = driver.find_element(By.CSS_SELECTOR, 'input[type="file"]')
        file_input.send_keys(HEIC_FILE_PATH)
        time.sleep(3)  # Wait for HEIC conversion
        driver.save_screenshot(f"{SCREENSHOTS_DIR}/02-source-tab.png")
        print("✅ Saved: 02-source-tab.png")
        
        # 3. Editor tab - Image controls
        print("\n3️⃣ Capturing Editor tab with image controls...")
        editor_tab = driver.find_element(By.XPATH, '//button[.//span[text()="Editor"]]')
        editor_tab.click()
        time.sleep(1)
        driver.save_screenshot(f"{SCREENSHOTS_DIR}/03-editor-tab.png")
        print("✅ Saved: 03-editor-tab.png")
        
        # 4. Apply some filters
        print("\n4️⃣ Applying filters and capturing...")
        # Rotate the image
        rotate_button = driver.find_element(By.XPATH, '//button[@title="Rotate Right (90°) - Applied before OCR"]')
        rotate_button.click()
        time.sleep(0.5)
        driver.save_screenshot(f"{SCREENSHOTS_DIR}/04-image-rotated.png")
        print("✅ Saved: 04-image-rotated.png")
        
        # 5. Process tab - Before extraction
        print("\n5️⃣ Capturing Process tab...")
        process_tab = driver.find_element(By.XPATH, '//button[.//span[text()="Process"]]')
        process_tab.click()
        time.sleep(1)
        driver.save_screenshot(f"{SCREENSHOTS_DIR}/05-process-tab.png")
        print("✅ Saved: 05-process-tab.png")
        
        # 6. Start extraction
        print("\n6️⃣ Starting OCR extraction...")
        extract_button = driver.find_element(By.XPATH, '//button[contains(., "Start Extraction")]')
        extract_button.click()
        time.sleep(2)  # Capture during processing
        driver.save_screenshot(f"{SCREENSHOTS_DIR}/06-extraction-running.png")
        print("✅ Saved: 06-extraction-running.png")
        
        # 7. Wait for completion and capture results
        print("\n7️⃣ Waiting for extraction to complete...")
        time.sleep(30)  # Wait for OCR to finish
        driver.save_screenshot(f"{SCREENSHOTS_DIR}/07-extraction-complete.png")
        print("✅ Saved: 07-extraction-complete.png")
        
        # 8. Results view - JSON tab
        print("\n8️⃣ Capturing results view...")
        time.sleep(1)
        driver.save_screenshot(f"{SCREENSHOTS_DIR}/08-results-json.png")
        print("✅ Saved: 08-results-json.png")
        
        # 9. Results view - Text tab
        print("\n9️⃣ Capturing Text tab...")
        text_tab = driver.find_element(By.XPATH, '//button[text()="Text"]')
        text_tab.click()
        time.sleep(0.5)
        driver.save_screenshot(f"{SCREENSHOTS_DIR}/09-results-text.png")
        print("✅ Saved: 09-results-text.png")
        
        # 10. Text overlay mode
        print("\n🔟 Capturing text overlay mode...")
        editor_tab = driver.find_element(By.XPATH, '//button[.//span[text()="Editor"]]')
        editor_tab.click()
        time.sleep(0.5)
        
        # Switch to text mode
        text_mode_button = driver.find_element(By.XPATH, '//button[@title="View text overlay"]')
        text_mode_button.click()
        time.sleep(1)
        driver.save_screenshot(f"{SCREENSHOTS_DIR}/10-text-overlay.png")
        print("✅ Saved: 10-text-overlay.png")
        
        # 11. Help modal
        print("\n1️⃣1️⃣ Capturing help modal...")
        # Press Shift+?
        from selenium.webdriver.common.keys import Keys
        from selenium.webdriver.common.action_chains import ActionChains
        actions = ActionChains(driver)
        actions.key_down(Keys.SHIFT).send_keys('?').key_up(Keys.SHIFT).perform()
        time.sleep(1)
        driver.save_screenshot(f"{SCREENSHOTS_DIR}/11-help-modal.png")
        print("✅ Saved: 11-help-modal.png")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        driver.quit()
    
    print("\n" + "="*60)
    print("✅ SCREENSHOT CAPTURE COMPLETE")
    print(f"📁 Screenshots saved to: {SCREENSHOTS_DIR}/")
    print("="*60)

if __name__ == "__main__":
    capture_screenshots()

