import { test } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Analyze the HEIC image to understand its orientation and content
 */
test('analyze HEIC image orientation and save rotated version', async ({ page }) => {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔍 ANALYZING HEIC IMAGE');
  console.log('═══════════════════════════════════════════════════\n');
  
  await page.goto('http://localhost:3000');
  console.log('✅ App loaded\n');
  
  const heicFilePath = '/home/owner/Downloads/IMG_0372.heic';
  console.log(`📁 Uploading: ${heicFilePath}\n`);
  
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(heicFilePath);
  console.log('✅ File uploaded\n');
  
  // Wait for HEIC conversion
  await page.waitForTimeout(5000);
  
  // Get the converted image data
  const imageInfo = await page.evaluate(() => {
    const img = document.querySelector('img[alt="Preview"]') as HTMLImageElement;
    if (!img) return null;
    
    return {
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      src: img.src.substring(0, 100)
    };
  });
  
  if (imageInfo) {
    console.log(`📐 Converted image dimensions: ${imageInfo.naturalWidth}x${imageInfo.naturalHeight}`);
    console.log(`📋 Image src: ${imageInfo.src}...\n`);
    
    if (imageInfo.naturalWidth > imageInfo.naturalHeight) {
      console.log('🔍 Image is LANDSCAPE (width > height)');
      console.log('   This means the image is already rotated or was taken in landscape mode\n');
    } else {
      console.log('🔍 Image is PORTRAIT (height > width)');
      console.log('   This means the image needs 90° rotation to be landscape\n');
    }
  }
  
  // Switch to Editor
  await page.locator('button:has-text("Editor")').click();
  await page.waitForTimeout(500);
  
  // Rotate 90 degrees
  const rotateBtn = page.locator('button[title*="Rotate Right"]');
  await rotateBtn.click();
  console.log('🔄 Rotated 90° clockwise\n');
  await page.waitForTimeout(1000);
  
  // Get the rotated image from canvas
  const rotatedImageData = await page.evaluate(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return null;
    
    return {
      width: canvas.width,
      height: canvas.height,
      dataUrl: canvas.toDataURL('image/png')
    };
  });
  
  if (rotatedImageData) {
    console.log(`📐 Rotated canvas dimensions: ${rotatedImageData.width}x${rotatedImageData.height}\n`);
    
    // Save the rotated image
    const buffer = Buffer.from(rotatedImageData.dataUrl.split(',')[1], 'base64');
    const outputPath = path.join(process.cwd(), 'rotated-image-from-editor.png');
    fs.writeFileSync(outputPath, buffer);
    console.log(`💾 Saved rotated image to: ${outputPath}\n`);
  }
  
  // Now test extraction with rotation
  await page.locator('button:has-text("Process")').click();
  await page.waitForTimeout(500);
  
  // Note: extractionPayload capture removed - not needed for this test
  
  // Select PaddleOCR
  const engineSelect = page.locator('select');
  await engineSelect.selectOption('PADDLE');
  await page.waitForTimeout(500);
  
  // Click extraction
  const extractBtn = page.locator('button:has-text("Start Extraction")');
  await extractBtn.click();
  console.log('🚀 Started extraction\n');
  
  await page.waitForTimeout(3000);
  
  // Get the actual payload that was sent
  const sentPayload = await page.evaluate(() => {
    const logs = (window as any).__debugLogs || [];
    const processedLog = logs.find((l: string) => l.includes('[DEBUG] Processed image start:'));
    return processedLog;
  });
  
  console.log('📋 Payload sent to OCR:', sentPayload ? 'Found' : 'Not found');
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('✅ ANALYSIS COMPLETE');
  console.log('═══════════════════════════════════════════════════\n');
});

