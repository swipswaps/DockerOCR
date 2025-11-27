import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Upload HEIC, rotate LEFT (270°), and save the processed image
 */
test('rotate HEIC left and save', async ({ page }) => {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔄 ROTATE LEFT TEST');
  console.log('═══════════════════════════════════════════════════\n');

  const allConsoleLogs: string[] = [];
  const allPageErrors: string[] = [];

  // Capture ALL console messages
  page.on('console', (msg) => {
    const text = msg.text();
    allConsoleLogs.push(text);
    console.log(`[CONSOLE] ${text}`);
  });

  // Capture ALL page errors
  page.on('pageerror', (err) => {
    const errMsg = `${err.name}: ${err.message}\n${err.stack}`;
    allPageErrors.push(errMsg);
    console.log(`[PAGE ERROR] ${errMsg}`);
  });

  // Capture request failures
  page.on('requestfailed', (request) => {
    const failure = request.failure();
    console.log(`[REQUEST FAILED] ${request.url()}: ${failure?.errorText}`);
  });

  await page.goto('http://localhost:3000');
  console.log('✅ App loaded\n');

  const heicFilePath = '/home/owner/Downloads/IMG_0372.heic';
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(heicFilePath);
  console.log('✅ HEIC file selected\n');

  // Switch to Process tab to see the Terminal logs
  await page.locator('button:has-text("Process")').click();
  console.log('✅ Switched to Process tab\n');

  // Wait for conversion to complete by watching for the success message
  console.log('⏳ Waiting for HEIC conversion to complete...\n');

  // Get all log messages from the Terminal component
  // The Terminal renders logs as divs with timestamp, level, and message spans
  const getLogMessages = async () => {
    return await page.evaluate(() => {
      // Find all log message spans (they have class "text-gray-200 whitespace-pre-wrap break-all")
      const messageSpans = document.querySelectorAll(
        '.text-gray-200.whitespace-pre-wrap.break-all'
      );
      return Array.from(messageSpans).map((span) => span.textContent || '');
    });
  };

  // Poll for conversion completion
  let conversionComplete = false;
  let conversionFailed = false;
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds max
  let lastLogCount = 0;

  console.log('📋 APP MESSAGES:');
  console.log('─────────────────────────────────────────────────');

  while (!conversionComplete && !conversionFailed && attempts < maxAttempts) {
    const logs = await getLogMessages();

    // Display new logs only
    if (logs.length > lastLogCount) {
      for (let i = lastLogCount; i < logs.length; i++) {
        const log = logs[i].trim();
        if (log) {
          console.log(`   ${log}`);

          if (log.includes('conversion complete') || log.includes('Preview and filters enabled')) {
            conversionComplete = true;
          }
          if (log.includes('conversion failed') || log.toLowerCase().includes('error')) {
            conversionFailed = true;
          }
        }
      }
      lastLogCount = logs.length;
    }

    if (!conversionComplete && !conversionFailed) {
      await page.waitForTimeout(1000);
      attempts++;
    }
  }

  console.log('─────────────────────────────────────────────────\n');

  if (conversionFailed) {
    console.log('❌ HEIC conversion FAILED\n');
    if (allPageErrors.length > 0) {
      console.log('\n🔴 PAGE ERRORS:');
      console.log(allPageErrors.join('\n'));
    }
    return;
  }

  if (!conversionComplete) {
    console.log('⚠️  HEIC conversion did not complete within 30 seconds\n');
    const finalLogs = await getLogMessages();
    if (finalLogs.length === 0) {
      console.log(
        '⚠️  No log messages found - Terminal may not be visible or logs not rendering\n'
      );
    }
    return;
  }

  console.log('✅ HEIC conversion completed successfully\n');

  // Switch to Editor tab to see the preview and rotate
  await page.locator('button:has-text("Editor")').click();
  console.log('✅ Switched to Editor tab\n');

  // Wait a moment for the editor to render
  await page.waitForTimeout(500);

  // Get dimensions from whatever element exists
  const originalDims = await page.evaluate(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (canvas) {
      return { width: canvas.width, height: canvas.height, type: 'canvas' };
    }
    // Try both "Preview" and "Editor Preview" alt text
    const img = document.querySelector(
      'img[alt="Preview"], img[alt="Editor Preview"]'
    ) as HTMLImageElement;
    if (img) {
      return { width: img.naturalWidth, height: img.naturalHeight, type: 'img' };
    }
    return null;
  });

  if (originalDims) {
    console.log(
      `📐 Original ${originalDims.type} dimensions: ${originalDims.width}x${originalDims.height}\n`
    );
  } else {
    console.log('❌ Could not get dimensions!\n');
    return;
  }

  // Find the Rotate LEFT button (270° or -90°)
  // Look for button with title containing "Rotate Left" or "270"
  const rotateLeftBtn = page.locator('button[title*="Rotate Left"], button[title*="270"]').first();

  // Check if it exists
  const rotateLeftExists = await rotateLeftBtn.count();

  if (rotateLeftExists === 0) {
    console.log('⚠️  Rotate Left button not found, looking for all rotate buttons...\n');

    // Get all button titles
    const allButtons = await page.locator('button').all();
    for (const btn of allButtons) {
      const title = await btn.getAttribute('title');
      const text = await btn.textContent();
      if (title && (title.toLowerCase().includes('rotate') || title.includes('90'))) {
        console.log(`   Found button: title="${title}", text="${text}"`);
      }
    }

    // Try clicking the rotate button 3 times (90° x 3 = 270°)
    const rotateRightBtn = page
      .locator('button[title*="Rotate Right"], button[title*="90"]')
      .first();
    const rotateRightExists = await rotateRightBtn.count();

    if (rotateRightExists > 0) {
      console.log('\n🔄 Rotating right 3 times (90° x 3 = 270° = rotate left)\n');
      await rotateRightBtn.click();
      await page.waitForTimeout(300);
      await rotateRightBtn.click();
      await page.waitForTimeout(300);
      await rotateRightBtn.click();
      await page.waitForTimeout(500);
      console.log('✅ Rotated 270° (equivalent to rotate left 90°)\n');
    }
  } else {
    await rotateLeftBtn.click();
    console.log('🔄 Rotated LEFT 90° (270° clockwise)\n');
    await page.waitForTimeout(500);
  }

  // Get rotated canvas dimensions
  const rotatedDims = await page.evaluate(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    return canvas ? { width: canvas.width, height: canvas.height } : null;
  });

  if (rotatedDims) {
    console.log(`📐 Rotated canvas dimensions: ${rotatedDims.width}x${rotatedDims.height}\n`);
  }

  // Switch to Process
  await page.locator('button:has-text("Process")').click();
  await page.waitForTimeout(500);

  // Select PaddleOCR
  const engineSelect = page.locator('select');
  await engineSelect.selectOption('PADDLE');
  await page.waitForTimeout(500);

  // Click extraction to trigger image processing
  const extractBtn = page.locator('button:has-text("Start Extraction")');
  await extractBtn.click();
  console.log('🚀 Started extraction\n');

  await page.waitForTimeout(5000);

  // Get the processed image from window object
  const processedImageDataUrl = await page.evaluate(() => {
    return (window as any).__processedImageForOCR;
  });

  if (processedImageDataUrl) {
    console.log(`✅ Found processed image data URL (${processedImageDataUrl.length} chars)\n`);

    // Extract base64 data
    const base64Data = processedImageDataUrl.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    const processedPath = path.join(process.cwd(), 'processed-for-ocr_2.jpg');
    fs.writeFileSync(processedPath, buffer);
    console.log(`💾 Saved processed image: ${processedPath}`);
    console.log(`   Size: ${Math.round(buffer.length / 1024)}KB\n`);

    // Check dimensions
    const dims = await page.evaluate((dataUrl) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.src = dataUrl;
      });
    }, processedImageDataUrl);

    console.log(`📐 Processed image dimensions: ${(dims as any).width}x${(dims as any).height}\n`);
  } else {
    console.log('\n❌ No processed image found in window object\n');
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('✅ ROTATE LEFT TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════\n');
});
