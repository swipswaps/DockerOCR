import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Debug rotation by intercepting the actual payload sent to OCR
 */
test('debug rotation payload sent to OCR', async ({ page }) => {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔍 DEBUGGING ROTATION PAYLOAD');
  console.log('═══════════════════════════════════════════════════\n');
  
  // Intercept network requests to see what's being sent
  const requests: any[] = [];
  page.on('request', request => {
    if (request.url().includes('generativelanguage.googleapis.com') || 
        request.url().includes('localhost:5000')) {
      const postData = request.postData();
      if (postData) {
        requests.push({
          url: request.url(),
          method: request.method(),
          hasImage: postData.includes('data:image') || postData.includes('base64'),
          size: postData.length
        });
        console.log(`📤 Request to: ${request.url()}`);
        console.log(`   Method: ${request.method()}`);
        console.log(`   Size: ${Math.round(postData.length / 1024)}KB`);
        console.log(`   Has image: ${postData.includes('data:image')}`);
      }
    }
  });
  
  // Navigate to the app
  await page.goto('http://localhost:3000');
  console.log('✅ App loaded\n');
  
  // Create a test image
  const testImageBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 400, 200);
    
    ctx.fillStyle = 'black';
    ctx.font = 'bold 48px Arial';
    ctx.fillText('HORIZONTAL TEXT', 10, 100);
    
    return canvas.toDataURL('image/png');
  });
  
  const buffer = Buffer.from(testImageBase64.split(',')[1], 'base64');
  const testFilePath = path.join(process.cwd(), 'test-debug-image.png');
  fs.writeFileSync(testFilePath, buffer);
  
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(testFilePath);
  console.log('✅ Test image uploaded (400x200)\n');
  
  await page.waitForTimeout(1000);
  
  // Switch to Editor and rotate
  await page.locator('button:has-text("Editor")').click();
  await page.waitForTimeout(500);
  
  const rotateRightBtn = page.locator('button[title*="Rotate Right"]');
  await rotateRightBtn.click();
  console.log('🔄 Rotated 90° (should become 200x400)\n');
  
  await page.waitForTimeout(500);
  
  // Now check what the processed image dimensions are
  const processedImageInfo = await page.evaluate(async () => {
    // Access the generateProcessedImage function
    const { generateProcessedImage } = await import('./utils/imageProcessing');
    const { DEFAULT_FILTERS } = await import('./constants');
    
    // Get the current preview URL from the app state
    const previewImg = document.querySelector('img[alt*="Preview"], img[src^="data:image"]') as HTMLImageElement;
    if (!previewImg) return { error: 'No preview image found' };
    
    const previewUrl = previewImg.src;
    
    // Test with rotation
    const filters = { ...DEFAULT_FILTERS, rotation: 90 };
    
    try {
      const rotatedImage = await generateProcessedImage(previewUrl, filters);
      
      // Load the rotated image to check dimensions
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            originalSrc: previewUrl.substring(0, 50),
            rotatedSrc: rotatedImage.substring(0, 50),
            rotatedWidth: img.width,
            rotatedHeight: img.height,
            rotatedSize: Math.round(rotatedImage.length / 1024)
          });
        };
        img.onerror = () => resolve({ error: 'Failed to load rotated image' });
        img.src = rotatedImage;
      });
    } catch (error: any) {
      return { error: error.message };
    }
  });
  
  console.log('📊 PROCESSED IMAGE INFO:');
  console.log('─────────────────────────────────────────────────');
  console.log(JSON.stringify(processedImageInfo, null, 2));
  console.log('');
  
  // Switch to Process tab
  await page.locator('button:has-text("Process")').click();
  await page.waitForTimeout(500);
  
  // Check if Gemini API key is available
  const hasGeminiKey = await page.evaluate(() => {
    return !!(window as any).ENV?.VITE_GEMINI_API_KEY;
  });
  
  if (hasGeminiKey) {
    console.log('✅ Gemini API key found - will test actual OCR\n');
    
    const runButton = page.locator('button').filter({ hasText: /run|process|extract/i }).first();
    if (await runButton.isVisible()) {
      await runButton.click();
      console.log('🚀 Started OCR extraction\n');
      
      // Wait for request
      await page.waitForTimeout(5000);
      
      if (requests.length > 0) {
        console.log(`\n📤 Captured ${requests.length} request(s)\n`);
      } else {
        console.log('\n⚠️  No requests captured\n');
      }
    }
  } else {
    console.log('⚠️  No Gemini API key - skipping actual OCR test\n');
  }
  
  // Cleanup
  fs.unlinkSync(testFilePath);
  
  console.log('═══════════════════════════════════════════════════');
  console.log('📋 DEBUG COMPLETE');
  console.log('═══════════════════════════════════════════════════\n');
});

