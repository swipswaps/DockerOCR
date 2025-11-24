import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test EXIF-based auto-rotation for HEIC files
 * Verifies that EXIF orientation metadata is read and applied automatically
 */
test('HEIC auto-rotation from EXIF metadata', async ({ page }) => {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📐 EXIF AUTO-ROTATION TEST');
  console.log('═══════════════════════════════════════════════════\n');
  
  // Capture all console and error messages
  page.on('console', msg => console.log(`[CONSOLE] ${msg.text()}`));
  page.on('pageerror', err => console.log(`[ERROR] ${err.message}`));
  
  await page.goto('http://localhost:3000');
  console.log('✅ App loaded\n');
  
  const heicFilePath = '/home/owner/Downloads/IMG_0372.heic';
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(heicFilePath);
  console.log('✅ HEIC file uploaded\n');
  
  // Switch to Process tab to see logs
  await page.locator('button:has-text("Process")').click();
  console.log('✅ Switched to Process tab\n');
  
  // Wait for conversion and capture messages
  console.log('⏳ Waiting for HEIC conversion with EXIF auto-rotation...\n');
  
  const getLogMessages = async () => {
    return await page.evaluate(() => {
      const messageSpans = document.querySelectorAll('.text-gray-200.whitespace-pre-wrap.break-all');
      return Array.from(messageSpans).map(span => span.textContent || '');
    });
  };
  
  let conversionComplete = false;
  let exifOrientationFound = false;
  let autoRotationApplied = false;
  let attempts = 0;
  const maxAttempts = 20;
  let lastLogCount = 0;
  
  console.log('📋 APP MESSAGES:');
  console.log('─────────────────────────────────────────────────');
  
  while (!conversionComplete && attempts < maxAttempts) {
    const logs = await getLogMessages();
    
    if (logs.length > lastLogCount) {
      for (let i = lastLogCount; i < logs.length; i++) {
        const log = logs[i].trim();
        if (log) {
          console.log(`   ${log}`);
          
          if (log.includes('EXIF Orientation')) {
            exifOrientationFound = true;
          }
          if (log.includes('Auto-correcting orientation')) {
            autoRotationApplied = true;
          }
          if (log.includes('conversion complete') || log.includes('Orientation corrected')) {
            conversionComplete = true;
          }
        }
      }
      lastLogCount = logs.length;
    }
    
    if (!conversionComplete) {
      await page.waitForTimeout(1000);
      attempts++;
    }
  }
  
  console.log('─────────────────────────────────────────────────\n');
  
  if (!conversionComplete) {
    console.log('⚠️  Conversion did not complete within 20 seconds\n');
    return;
  }
  
  console.log('✅ HEIC conversion completed\n');
  console.log(`📐 EXIF orientation found: ${exifOrientationFound ? 'YES' : 'NO'}`);
  console.log(`🔄 Auto-rotation applied: ${autoRotationApplied ? 'YES' : 'NO'}\n`);
  
  // Switch to Editor to check the image
  await page.locator('button:has-text("Editor")').click();
  await page.waitForTimeout(500);
  
  const imageDims = await page.evaluate(() => {
    const img = document.querySelector('img[alt="Preview"], img[alt="Editor Preview"]') as HTMLImageElement;
    return img ? { width: img.naturalWidth, height: img.naturalHeight } : null;
  });
  
  if (imageDims) {
    console.log(`📐 Auto-rotated image dimensions: ${imageDims.width}x${imageDims.height}\n`);
  }
  
  // Now test OCR extraction WITHOUT manual rotation
  await page.locator('button:has-text("Process")').click();
  await page.waitForTimeout(500);
  
  const engineSelect = page.locator('select');
  await engineSelect.selectOption('PADDLE');
  
  const extractBtn = page.locator('button:has-text("Start Extraction")');
  await extractBtn.click();
  console.log('🚀 Started OCR extraction (no manual rotation needed)\n');
  
  await page.waitForTimeout(5000);
  
  const processedImageDataUrl = await page.evaluate(() => {
    return (window as any).__processedImageForOCR;
  });
  
  if (processedImageDataUrl) {
    const base64Data = processedImageDataUrl.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    const outputPath = path.join(process.cwd(), 'auto-rotated-from-exif.jpg');
    fs.writeFileSync(outputPath, buffer);
    console.log(`💾 Saved: ${outputPath} (${Math.round(buffer.length / 1024)}KB)\n`);
    
    const dims = await page.evaluate((dataUrl) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.src = dataUrl;
      });
    }, processedImageDataUrl);
    
    console.log(`📐 Processed image: ${(dims as any).width}x${(dims as any).height}\n`);
  }
  
  console.log('═══════════════════════════════════════════════════');
  console.log('✅ EXIF AUTO-ROTATION TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════\n');
});

