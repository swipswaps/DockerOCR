#!/usr/bin/env python3
"""
Capture screenshot of JSON results tab with confidence scores and bounding boxes
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import time
import os
import subprocess
import requests
import sys

# Configuration
HEIC_FILE_PATH = "/home/owner/Downloads/IMG_0372.heic"
APP_URL = "http://localhost:3000"
PADDLEOCR_URL = "http://localhost:5000"
SCREENSHOTS_DIR = "screenshots"

def check_docker_running():
    """Check if Docker daemon is running"""
    try:
        result = subprocess.run(['docker', 'ps'], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            print("✅ Docker daemon is running")
            return True
        else:
            print(f"❌ Docker daemon error: {result.stderr}")
            return False
    except subprocess.TimeoutExpired:
        print("❌ Docker command timed out - Docker may not be running")
        return False
    except FileNotFoundError:
        print("❌ Docker command not found - Is Docker installed?")
        return False
    except Exception as e:
        print(f"❌ Error checking Docker: {e}")
        return False

def check_paddleocr_container():
    """Check if PaddleOCR container is running"""
    try:
        result = subprocess.run(
            ['docker', 'ps', '--filter', 'name=paddleocr-server', '--format', '{{.Status}}'],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            status = result.stdout.strip()
            print(f"✅ PaddleOCR container status: {status}")
            if 'Up' in status:
                return True
            else:
                print(f"❌ PaddleOCR container is not running (status: {status})")
                return False
        else:
            print("❌ PaddleOCR container not found")
            return False
    except Exception as e:
        print(f"❌ Error checking PaddleOCR container: {e}")
        return False

def check_paddleocr_health():
    """Check if PaddleOCR API is responding"""
    try:
        response = requests.get(f"{PADDLEOCR_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ PaddleOCR health check passed: {data}")
            return True
        else:
            print(f"❌ PaddleOCR health check failed with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to PaddleOCR API - container may be starting")
        return False
    except requests.exceptions.Timeout:
        print("❌ PaddleOCR health check timed out")
        return False
    except Exception as e:
        print(f"❌ Error checking PaddleOCR health: {e}")
        return False

def start_paddleocr_container():
    """Start PaddleOCR container if not running"""
    print("\n🔄 Starting PaddleOCR container...")
    try:
        result = subprocess.run(
            ['docker', 'compose', 'up', '-d', 'paddleocr'],
            capture_output=True, text=True, timeout=60
        )
        if result.returncode == 0:
            print("✅ PaddleOCR container started")
            return True
        else:
            print(f"❌ Failed to start PaddleOCR container: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error starting PaddleOCR container: {e}")
        return False

def wait_for_paddleocr_ready(max_wait=60):
    """Wait for PaddleOCR to be fully ready"""
    print(f"\n⏳ Waiting for PaddleOCR to be ready (max {max_wait}s)...")
    start_time = time.time()

    while time.time() - start_time < max_wait:
        if check_paddleocr_health():
            elapsed = int(time.time() - start_time)
            print(f"✅ PaddleOCR is ready (took {elapsed}s)")
            return True

        elapsed = int(time.time() - start_time)
        print(f"   Waiting... ({elapsed}s/{max_wait}s)")
        time.sleep(5)

    print(f"❌ PaddleOCR did not become ready within {max_wait}s")
    return False

def ensure_paddleocr_ready():
    """Ensure PaddleOCR is running and ready"""
    print("\n" + "="*60)
    print("🔍 CHECKING PADDLEOCR STATUS")
    print("="*60)

    # Check Docker daemon
    if not check_docker_running():
        print("\n❌ FATAL: Docker is not running")
        print("   Please start Docker Desktop or Docker daemon")
        return False

    # Check if container is running
    if not check_paddleocr_container():
        print("\n⚠️  PaddleOCR container is not running")
        if not start_paddleocr_container():
            return False
        # Wait for container to start
        time.sleep(5)

    # Check if API is healthy
    if not check_paddleocr_health():
        print("\n⚠️  PaddleOCR is not ready yet")
        if not wait_for_paddleocr_ready(max_wait=60):
            return False

    print("\n" + "="*60)
    print("✅ PADDLEOCR IS READY")
    print("="*60)
    return True

def setup_driver():
    """Setup Chrome driver with appropriate options"""
    chrome_options = Options()
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('--force-device-scale-factor=1')
    return webdriver.Chrome(options=chrome_options)

def capture_json_results_screenshot():
    print("\n" + "="*60)
    print("📸 CAPTURING JSON RESULTS SCREENSHOT")
    print("="*60)

    driver = setup_driver()

    try:
        # Navigate to app
        print("\n1️⃣ Loading application...")
        driver.get(APP_URL)
        time.sleep(2)

        # Upload file
        print("\n2️⃣ Uploading HEIC file...")
        file_input = driver.find_element(By.CSS_SELECTOR, 'input[type="file"]')
        file_input.send_keys(HEIC_FILE_PATH)
        time.sleep(3)  # Wait for HEIC conversion
        print("   File uploaded, waiting for conversion...")
        time.sleep(2)

        # Go to Process tab
        print("\n3️⃣ Navigating to Process tab...")
        process_tab = driver.find_element(By.XPATH, '//button[.//span[text()="Process"]]')
        process_tab.click()
        time.sleep(1)

        # Verify PaddleOCR is selected
        print("\n4️⃣ Verifying PaddleOCR engine is selected...")
        try:
            paddleocr_radio = driver.find_element(By.XPATH, '//input[@value="paddleocr"]')
            if not paddleocr_radio.is_selected():
                print("   Selecting PaddleOCR engine...")
                paddleocr_radio.click()
                time.sleep(0.5)
            else:
                print("   PaddleOCR already selected")
        except Exception as e:
            print(f"   Warning: Could not verify OCR engine selection: {e}")

        # Start extraction
        print("\n5️⃣ Starting OCR extraction...")
        extract_button = driver.find_element(By.XPATH, '//button[contains(., "Start Extraction")]')

        # Check if button is disabled
        if extract_button.get_attribute('disabled'):
            print("   ❌ Extract button is disabled - checking why...")
            # Check terminal for error messages
            try:
                terminal = driver.find_element(By.CSS_SELECTOR, '.terminal, pre')
                terminal_text = terminal.text
                print(f"   Terminal output:\n{terminal_text}")
            except:
                pass
            raise Exception("Extract button is disabled - PaddleOCR may not be ready")

        extract_button.click()
        print("   Extraction started!")

        # Wait for extraction to complete - monitor terminal for completion
        print("\n6️⃣ Waiting for extraction to complete...")
        max_wait = 60
        start_time = time.time()
        extraction_complete = False

        while time.time() - start_time < max_wait:
            try:
                # Check if results are visible
                results_check = driver.find_elements(By.XPATH, '//button[text()="JSON"]')
                if results_check and len(results_check) > 0:
                    # Check if there's actual content
                    time.sleep(2)  # Give it a moment to populate
                    try:
                        # Look for JSON content indicators
                        page_text = driver.page_source
                        if '"text"' in page_text and '"confidence"' in page_text:
                            elapsed = int(time.time() - start_time)
                            print(f"   ✅ Extraction complete! (took {elapsed}s)")
                            extraction_complete = True
                            break
                    except:
                        pass

                elapsed = int(time.time() - start_time)
                if elapsed % 5 == 0:  # Print every 5 seconds
                    print(f"   Still processing... ({elapsed}s/{max_wait}s)")
                time.sleep(1)
            except:
                time.sleep(1)

        if not extraction_complete:
            print(f"   ⚠️  Extraction did not complete within {max_wait}s")
            # Capture screenshot anyway to see what happened

        # Make sure we're on JSON tab (should be default)
        print("\n7️⃣ Ensuring JSON tab is selected...")
        try:
            json_tab = driver.find_element(By.XPATH, '//button[text()="JSON"]')
            json_tab.click()
            time.sleep(1)
            print("   JSON tab selected")
        except Exception as e:
            print(f"   Warning: Could not select JSON tab: {e}")

        # Scroll the results panel to show confidence scores and bounding boxes
        print("\n8️⃣ Scrolling to show confidence scores and bounding boxes...")
        try:
            # Find the results container and scroll it slightly
            results_container = driver.find_element(By.CSS_SELECTOR, 'pre')
            driver.execute_script("arguments[0].scrollTop = 150", results_container)
            time.sleep(0.5)
            print("   Results scrolled to show data structure")
        except Exception as e:
            print(f"   Could not scroll results container: {e}")

        # Capture screenshot
        print("\n9️⃣ Capturing screenshot...")
        driver.save_screenshot(f"{SCREENSHOTS_DIR}/08-results-json.png")
        print(f"✅ Saved: {SCREENSHOTS_DIR}/08-results-json.png")

        # Also capture a full page screenshot for reference
        print("\n🔟 Capturing full page screenshot...")
        driver.save_screenshot(f"{SCREENSHOTS_DIR}/08-results-json-fullpage.png")
        print(f"✅ Saved: {SCREENSHOTS_DIR}/08-results-json-fullpage.png")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        # Capture error screenshot
        try:
            driver.save_screenshot(f"{SCREENSHOTS_DIR}/error-screenshot.png")
            print(f"📸 Error screenshot saved: {SCREENSHOTS_DIR}/error-screenshot.png")
        except:
            pass

    finally:
        driver.quit()

    print("\n" + "="*60)
    print("✅ SCREENSHOT CAPTURE COMPLETE")
    print("="*60)

if __name__ == "__main__":
    # First ensure PaddleOCR is ready
    if not ensure_paddleocr_ready():
        print("\n❌ FATAL: Cannot proceed without PaddleOCR")
        print("\nTroubleshooting steps:")
        print("1. Check if Docker is running: docker ps")
        print("2. Start PaddleOCR: docker compose up -d paddleocr")
        print("3. Check logs: docker compose logs -f paddleocr")
        print("4. Check health: curl http://localhost:5000/health")
        sys.exit(1)

    # Now capture the screenshot
    capture_json_results_screenshot()

