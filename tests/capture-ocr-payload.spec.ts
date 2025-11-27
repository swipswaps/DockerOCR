import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Capture the actual image payload sent to OCR after rotation
 */
test('capture OCR payload after rotation', async ({ page }) => {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔍 CAPTURING OCR PAYLOAD AFTER ROTATION');
  console.log('═══════════════════════════════════════════════════\n');

  const consoleLogs: string[] = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push(text);
  });

  // Intercept network requests to capture the payload
  const payloads: any[] = [];

  page.on('request', (request) => {
    if (
      request.url().includes('paddle') ||
      request.url().includes('gemini') ||
      request.url().includes('ocr')
    ) {
      const postData = request.postData();
      if (postData) {
        console.log(`📤 OCR Request to: ${request.url()}`);
        payloads.push({
          url: request.url(),
          data: postData.substring(0, 200),
        });
      }
    }
  });

  await page.goto('http://localhost:3000');
  console.log('✅ App loaded\n');

  const heicFilePath = '/home/owner/Downloads/IMG_0372.heic';
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(heicFilePath);
  console.log('✅ HEIC uploaded\n');

  await page.waitForTimeout(5000);

  // Get original dimensions
  const originalDims = await page.evaluate(() => {
    const img = document.querySelector('img[alt="Preview"]') as HTMLImageElement;
    return img ? { width: img.naturalWidth, height: img.naturalHeight } : null;
  });

  if (originalDims) {
    console.log(
      `📐 Original (converted) dimensions: ${originalDims.width}x${originalDims.height}\n`
    );
  }

  // Switch to Editor and rotate
  await page.locator('button:has-text("Editor")').click();
  await page.waitForTimeout(500);

  const rotateBtn = page.locator('button[title*="Rotate Right"]');
  await rotateBtn.click();
  console.log('🔄 Rotated 90°\n');
  await page.waitForTimeout(1000);

  // Get rotated canvas dimensions
  const rotatedDims = await page.evaluate(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    return canvas ? { width: canvas.width, height: canvas.height } : null;
  });

  if (rotatedDims) {
    console.log(`📐 Rotated canvas dimensions: ${rotatedDims.width}x${rotatedDims.height}\n`);
  }

  // Save the rotated preview image
  const rotatedPreview = await page.evaluate(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    return canvas ? canvas.toDataURL('image/png') : null;
  });

  if (rotatedPreview) {
    const buffer = Buffer.from(rotatedPreview.split(',')[1], 'base64');
    const previewPath = path.join(process.cwd(), 'rotated-preview.png');
    fs.writeFileSync(previewPath, buffer);
    console.log(`💾 Saved rotated preview: ${previewPath}\n`);
  }

  // Switch to Process
  await page.locator('button:has-text("Process")').click();
  await page.waitForTimeout(500);

  // Select PaddleOCR
  const engineSelect = page.locator('select');
  await engineSelect.selectOption('PADDLE');
  await page.waitForTimeout(500);

  // Clear logs
  consoleLogs.length = 0;

  // Click extraction
  const extractBtn = page.locator('button:has-text("Start Extraction")');
  await extractBtn.click();
  console.log('🚀 Started extraction\n');

  await page.waitForTimeout(5000);

  // Check console logs for the processed image
  const debugLogs = consoleLogs.filter((log) => log.includes('[DEBUG]'));

  console.log('\n📋 DEBUG LOGS:');
  console.log('─────────────────────────────────────────────────');
  debugLogs.forEach((log) => console.log(log));

  // Get the FULL processed image from window object
  const processedImageDataUrl = await page.evaluate(() => {
    return (window as any).__processedImageForOCR;
  });

  if (processedImageDataUrl) {
    console.log(`\n✅ Found processed image data URL (${processedImageDataUrl.length} chars)\n`);

    // Extract base64 data
    const base64Data = processedImageDataUrl.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    const processedPath = path.join(process.cwd(), 'processed-for-ocr.jpg');
    fs.writeFileSync(processedPath, buffer);
    console.log(`💾 Saved processed image sent to OCR: ${processedPath}`);
    console.log(`   Size: ${Math.round(buffer.length / 1024)}KB\n`);

    // Also check dimensions
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
  console.log('✅ CAPTURE COMPLETE');
  console.log('═══════════════════════════════════════════════════\n');
});
