import { test, expect } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

test('debug PaddleOCR with real HEIC file and Docker logs', async ({ page }) => {
  test.setTimeout(180000); // 3 minutes timeout
  const errors: Array<{ message: string; stack?: string }> = [];
  const consoleMessages: string[] = [];
  let hooksErrorDetected = false;

  // Capture ALL console messages
  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    consoleMessages.push(`[${type}] ${text}`);
    console.log(`🔍 Console [${type}]:`, text);
  });

  // Capture page errors
  page.on('pageerror', (error) => {
    console.error('❌ PAGE ERROR:', error.message);
    console.error('Stack:', error.stack);
    errors.push({ message: error.message, stack: error.stack });

    if (error.message.includes('hooks') || error.message.includes('Rendered more')) {
      hooksErrorDetected = true;
      console.error('\n🚨 HOOKS ERROR DETECTED! 🚨\n');
    }
  });

  // Navigate to the app
  console.log('\n=== Navigating to app ===');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Wait for initial render
  await page.waitForTimeout(2000);

  console.log('\n=== Checking for error boundary ===');
  const errorBoundary = await page.locator('text=Something went wrong').count();

  if (errorBoundary > 0) {
    console.error('❌ Error boundary is visible!');
    const errorText = await page.locator('.text-red-400').textContent();
    console.error('Error message:', errorText);

    // Take screenshot
    await page.screenshot({ path: 'test-results/error-screenshot.png', fullPage: true });

    // Print all console messages
    console.log('\n=== ALL CONSOLE MESSAGES ===');
    consoleMessages.forEach((msg) => console.log(msg));

    // Print all errors
    console.log('\n=== ALL ERRORS ===');
    errors.forEach((err) => {
      console.log('Message:', err.message);
      if (err.stack) console.log('Stack:', err.stack);
    });

    throw new Error(`Hooks error detected: ${errorText}`);
  } else {
    console.log('✅ No error boundary visible');
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Total errors: ${errors.length}`);
  }

  // Try the exact scenario: Upload HEIC file, wait for conversion, switch to PaddleOCR, click Start Extraction
  console.log('\n=== Testing HEIC + PaddleOCR extraction flow ===');

  // First, we need to upload a REAL HEIC file
  console.log('Step 1: Uploading a REAL HEIC file...');
  const fileInput = page.locator('input[type="file"]');

  // Use the actual HEIC file from the user's system
  const heicFilePath = '/home/owner/Documents/sunelec/IMG_0371.heic';

  await fileInput.setInputFiles(heicFilePath);

  console.log('Waiting for HEIC conversion to complete...');

  // Wait for the "Converting HEIC..." spinner to appear
  const convertingSpinner = page.locator('text=Converting HEIC...');
  const spinnerAppeared = (await convertingSpinner.count()) > 0;
  if (spinnerAppeared) {
    console.log('✅ HEIC conversion started (spinner visible)');
    // Wait for spinner to disappear (conversion complete)
    await convertingSpinner.waitFor({ state: 'hidden', timeout: 15000 });
    console.log('✅ HEIC conversion completed (spinner hidden)');
  } else {
    console.log('⚠️  No conversion spinner detected, waiting anyway...');
    await page.waitForTimeout(5000);
  }

  // Check console for HEIC conversion messages
  const heicLogs = consoleMessages.filter(
    (msg) =>
      msg.toLowerCase().includes('heic') ||
      msg.toLowerCase().includes('converting') ||
      msg.toLowerCase().includes('conversion')
  );
  console.log(`HEIC-related logs: ${heicLogs.length}`);
  heicLogs.forEach((log) => console.log('  ', log));

  // Check if preview image is visible
  const previewImage = page.locator('img[alt="Source"]');
  const imageVisible = (await previewImage.count()) > 0;
  console.log(`Preview image visible: ${imageVisible}`);

  // Check for error after HEIC upload
  let errorCheck = await page.locator('text=Something went wrong').count();
  if (errorCheck > 0) {
    const errorText = await page.locator('.text-red-400').textContent();
    console.error('❌ Error after HEIC upload:', errorText);
    await page.screenshot({ path: 'test-results/error-after-heic-upload.png' });

    // Print all console messages
    console.log('\n=== CONSOLE MESSAGES AT ERROR ===');
    consoleMessages.forEach((msg) => console.log(msg));

    throw new Error(`Error after HEIC upload: ${errorText}`);
  }
  console.log('✅ HEIC file uploaded (conversion may have failed, but no hooks error yet)');

  // Step 2: Switch to Process tab
  console.log('Step 2: Switching to Process tab...');
  const processTab = page.locator('button:has-text("Process")');
  if ((await processTab.count()) > 0) {
    await processTab.click();
    await page.waitForTimeout(500);
  }

  // Step 3: Change engine to PaddleOCR
  console.log('Step 3: Changing engine to PaddleOCR...');
  const engineSelect = page.locator('select').first();
  await engineSelect.selectOption('PADDLE');
  await page.waitForTimeout(500);

  errorCheck = await page.locator('text=Something went wrong').count();
  if (errorCheck > 0) {
    const errorText = await page.locator('.text-red-400').textContent();
    console.error('❌ Error after changing engine:', errorText);
    await page.screenshot({ path: 'test-results/error-after-engine-change.png' });
    throw new Error(`Error after engine change: ${errorText}`);
  }
  console.log('✅ Engine changed to PaddleOCR');

  // Step 4: Click Start Extraction and WAIT for the full extraction to complete
  console.log('Step 4: Clicking Start Extraction...');
  const startButton = page.locator('button:has-text("Start Extraction")');
  if ((await startButton.count()) > 0) {
    await startButton.click();
    console.log('Start Extraction clicked, now waiting for FULL extraction process...');

    // Check for error immediately after click
    await page.waitForTimeout(500);
    errorCheck = await page.locator('text=Something went wrong').count();
    if (errorCheck > 0) {
      const errorText = await page.locator('.text-red-400').textContent();
      console.error('❌ Error immediately after Start Extraction click:', errorText);
      await page.screenshot({ path: 'test-results/error-immediate.png' });

      console.log('\n=== ALL CONSOLE MESSAGES ===');
      consoleMessages.forEach((msg) => console.log(msg));

      throw new Error(`Error immediately after click: ${errorText}`);
    }

    // Wait for processing to start (button should show processing state)
    console.log('Waiting for processing to start...');
    await page.waitForTimeout(2000);

    errorCheck = await page.locator('text=Something went wrong').count();
    if (errorCheck > 0) {
      const errorText = await page.locator('.text-red-400').textContent();
      console.error('❌ Error during processing start:', errorText);
      await page.screenshot({ path: 'test-results/error-during-start.png' });

      console.log('\n=== ALL CONSOLE MESSAGES ===');
      consoleMessages.forEach((msg) => console.log(msg));

      throw new Error(`Error during processing start: ${errorText}`);
    }

    // Wait for the FULL extraction to complete (this can take 10-30 seconds)
    console.log('Waiting for FULL OCR extraction to complete (up to 90 seconds)...');

    // Monitor for errors during the extraction
    let extractionComplete = false;
    let extractionError = false;

    for (let i = 0; i < 90; i++) {
      await page.waitForTimeout(1000);

      errorCheck = await page.locator('text=Something went wrong').count();
      if (errorCheck > 0) {
        const errorText = await page.locator('.text-red-400').textContent();
        console.error(`❌ Error during extraction at ${i} seconds:`, errorText);
        await page.screenshot({ path: `test-results/error-at-${i}s.png` });

        console.log('\n=== ALL CONSOLE MESSAGES ===');
        consoleMessages.forEach((msg) => console.log(msg));

        console.log('\n=== ALL ERRORS ===');
        errors.forEach((err) => {
          console.log('Message:', err.message);
          if (err.stack) console.log('Stack:', err.stack);
        });

        // Get Docker logs
        console.log('\n=== DOCKER LOGS (last 50 lines) ===');
        try {
          const { stdout } = await execAsync('docker logs paddleocr-server --tail 50');
          console.log(stdout);
        } catch (err) {
          console.error('Failed to get Docker logs:', err);
        }

        extractionError = true;
        break;
      }

      // Check if extraction completed successfully
      const successLog = consoleMessages.find((msg) => msg.includes('Extraction successful'));
      const errorLog = consoleMessages.find(
        (msg) => msg.includes('ERROR') && msg.includes('PaddleOCR')
      );

      if (successLog) {
        console.log(`✅ Extraction completed successfully at ${i} seconds!`);
        extractionComplete = true;
        break;
      }

      if (errorLog) {
        console.log(`⚠️  Extraction error detected in console at ${i} seconds`);
        console.log(`Error log: ${errorLog}`);

        // Get Docker logs
        console.log('\n=== DOCKER LOGS (last 50 lines) ===');
        try {
          const { stdout } = await execAsync('docker logs paddleocr-server --tail 50');
          console.log(stdout);
        } catch (err) {
          console.error('Failed to get Docker logs:', err);
        }

        extractionError = true;
        break;
      }

      // Log progress every 5 seconds
      if (i % 5 === 0 && i > 0) {
        console.log(`  ... still processing (${i}s elapsed)`);

        // Show recent console messages
        const recentLogs = consoleMessages.slice(-5);
        if (recentLogs.length > 0) {
          console.log('  Recent logs:');
          recentLogs.forEach((log) => console.log(`    ${log}`));
        }
      }
    }

    if (extractionError) {
      console.log('\n=== FINAL CONSOLE MESSAGES ===');
      consoleMessages.forEach((msg) => console.log(msg));

      console.log('\n=== FINAL DOCKER LOGS ===');
      try {
        const { stdout } = await execAsync('docker logs paddleocr-server --tail 100');
        console.log(stdout);
      } catch (err) {
        console.error('Failed to get Docker logs:', err);
      }

      throw new Error('Extraction failed - see logs above');
    }

    if (!extractionComplete) {
      console.log('⚠️  Extraction did not complete within 90 seconds');

      console.log('\n=== FINAL CONSOLE MESSAGES ===');
      consoleMessages.forEach((msg) => console.log(msg));

      console.log('\n=== FINAL DOCKER LOGS ===');
      try {
        const { stdout } = await execAsync('docker logs paddleocr-server --tail 100');
        console.log(stdout);
      } catch (err) {
        console.error('Failed to get Docker logs:', err);
      }
    } else {
      console.log('✅ Full extraction process completed without hooks error');
    }
  }

  console.log('\n✅ Test completed - checking results...');
  expect(hooksErrorDetected).toBe(false);
});
