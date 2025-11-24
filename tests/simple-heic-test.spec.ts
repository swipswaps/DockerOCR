import { test } from '@playwright/test';

test('simple HEIC upload and check logs', async ({ page }) => {
  console.log('\n🔍 Simple HEIC test\n');
  
  // Capture ALL console output
  page.on('console', msg => {
    console.log(`[BROWSER] ${msg.text()}`);
  });
  
  // Capture page errors
  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.message}`);
  });
  
  await page.goto('http://localhost:3000');
  console.log('✅ Page loaded\n');
  
  await page.waitForTimeout(1000);
  
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('/home/owner/Downloads/IMG_0372.heic');
  console.log('✅ File uploaded\n');
  
  // Wait longer for conversion
  console.log('⏳ Waiting for HEIC conversion...\n');
  await page.waitForTimeout(10000);
  
  // Take screenshot
  await page.screenshot({ path: 'heic-upload-screenshot.png', fullPage: true });
  console.log('📸 Screenshot saved\n');
  
  // Get preview image info
  const imgInfo = await page.evaluate(() => {
    const img = document.querySelector('img[alt="Preview"]') as HTMLImageElement;
    if (!img) return null;
    return {
      visible: img.offsetWidth > 0,
      width: img.naturalWidth,
      height: img.naturalHeight,
      src: img.src.substring(0, 50)
    };
  });
  
  console.log('📐 Preview image:', JSON.stringify(imgInfo, null, 2));
});

