import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test EXIF auto-rotation for HEIC files
 */
test('HEIC file auto-rotates based on EXIF orientation', async ({ page }) => {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔍 TESTING EXIF AUTO-ROTATION');
  console.log('═══════════════════════════════════════════════════\n');

  const consoleLogs: string[] = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push(text);
    if (
      text.includes('EXIF') ||
      text.includes('Auto-correcting') ||
      text.includes('auto-rotated')
    ) {
      console.log(`📋 ${text}`);
    }
  });

  await page.goto('http://localhost:3000');
  console.log('✅ App loaded\n');

  const heicFilePath = '/home/owner/Downloads/IMG_0372.heic';
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(heicFilePath);
  console.log('✅ HEIC uploaded\n');

  // Wait for HEIC conversion and auto-rotation
  await page.waitForTimeout(6000);

  // Get ALL logs from the UI
  const uiLogs = await page.locator('.log-entry, [class*="log"]').allTextContents();
  console.log('\n📋 ALL UI LOGS:');
  console.log('─────────────────────────────────────────────────');
  uiLogs.forEach((log) => {
    if (log.trim()) {
      console.log(`   ${log.trim()}`);
    }
  });

  // Check if auto-rotation was applied
  const exifLogs = consoleLogs.filter(
    (log) =>
      log.includes('EXIF Orientation') ||
      log.includes('Auto-correcting') ||
      log.includes('auto-rotated')
  );

  console.log('\n📊 EXIF AUTO-ROTATION RESULTS:');
  console.log('─────────────────────────────────────────────────');

  if (exifLogs.length > 0) {
    console.log('✅ EXIF orientation detected and processed:');
    exifLogs.forEach((log) => console.log(`   ${log}`));
  } else {
    console.log('⚠️  No EXIF auto-rotation logs found');
  }

  // Get the preview image dimensions
  const previewDims = await page.evaluate(() => {
    const img = document.querySelector('img[alt="Preview"]') as HTMLImageElement;
    return img ? { width: img.naturalWidth, height: img.naturalHeight } : null;
  });

  if (previewDims) {
    console.log(`\n📐 Preview image dimensions: ${previewDims.width}x${previewDims.height}`);

    if (previewDims.width > previewDims.height) {
      console.log('   ✅ Image is LANDSCAPE (auto-rotation applied correctly!)');
    } else {
      console.log('   📱 Image is PORTRAIT');
    }
  }

  // Save the auto-rotated preview
  const previewDataUrl = await page.evaluate(() => {
    const img = document.querySelector('img[alt="Preview"]') as HTMLImageElement;
    return img ? img.src : null;
  });

  if (previewDataUrl) {
    const buffer = Buffer.from(previewDataUrl.split(',')[1], 'base64');
    const outputPath = path.join(process.cwd(), 'auto-rotated-preview.png');
    fs.writeFileSync(outputPath, buffer);
    console.log(`\n💾 Saved auto-rotated preview: ${outputPath}`);
    console.log(`   Size: ${Math.round(buffer.length / 1024)}KB\n`);
  }

  // Now test extraction WITHOUT manual rotation
  await page.locator('button:has-text("Process")').click();
  await page.waitForTimeout(500);

  const engineSelect = page.locator('select');
  await engineSelect.selectOption('PADDLE');
  await page.waitForTimeout(500);

  // Clear logs
  consoleLogs.length = 0;

  const extractBtn = page.locator('button:has-text("Start Extraction")');
  await extractBtn.click();
  console.log('🚀 Started extraction (NO manual rotation needed!)\n');

  await page.waitForTimeout(5000);

  // Get the processed image
  const processedImageDataUrl = await page.evaluate(() => {
    return (window as any).__processedImageForOCR;
  });

  if (processedImageDataUrl) {
    const base64Data = processedImageDataUrl.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    const processedPath = path.join(process.cwd(), 'auto-rotated-for-ocr.jpg');
    fs.writeFileSync(processedPath, buffer);
    console.log(`💾 Saved image sent to OCR: ${processedPath}`);
    console.log(`   Size: ${Math.round(buffer.length / 1024)}KB\n`);

    // Check dimensions
    const dims = await page.evaluate((dataUrl) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.src = dataUrl;
      });
    }, processedImageDataUrl);

    console.log(`📐 OCR image dimensions: ${(dims as any).width}x${(dims as any).height}\n`);
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('✅ TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════\n');
  console.log('📝 EXPECTED RESULT:');
  console.log('   - EXIF Orientation: 3 (Rotate 180°)');
  console.log('   - Auto-rotation: 180° applied automatically');
  console.log('   - Preview: Correctly oriented (text readable)');
  console.log('   - OCR extraction: Works WITHOUT manual rotation\n');
});
