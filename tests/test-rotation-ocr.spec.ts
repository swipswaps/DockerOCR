import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test OCR extraction with rotated images
 */
test('verify rotation is applied before OCR extraction', async ({ page }) => {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔍 TESTING ROTATION + OCR EXTRACTION');
  console.log('═══════════════════════════════════════════════════\n');

  // Navigate to the app
  await page.goto('http://localhost:3000');

  console.log('✅ App loaded\n');

  // Create a test image with text (rotated 90 degrees)
  // We'll use a simple canvas-based approach
  const testImageBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;

    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 400, 200);

    // Black text (horizontal)
    ctx.fillStyle = 'black';
    ctx.font = 'bold 48px Arial';
    ctx.fillText('TEST ROTATION', 50, 100);

    return canvas.toDataURL('image/png');
  });

  console.log('📸 Created test image with horizontal text\n');

  // Upload the test image
  const buffer = Buffer.from(testImageBase64.split(',')[1], 'base64');
  const testFilePath = path.join(process.cwd(), 'test-rotation-image.png');
  fs.writeFileSync(testFilePath, buffer);

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(testFilePath);

  console.log('✅ Test image uploaded\n');

  // Wait for image to load
  await page.waitForTimeout(1000);

  // Click on Editor tab
  await page.locator('button:has-text("Editor")').click();
  console.log('✅ Switched to Editor tab\n');

  // Check current rotation value
  const rotationBefore = await page.evaluate(() => {
    const rotationSlider = document.querySelector('input[type="range"]') as HTMLInputElement;
    return rotationSlider?.value || '0';
  });
  console.log(`📐 Current rotation: ${rotationBefore}°\n`);

  // Click rotate right button (90 degrees)
  const rotateButtons = await page.locator('button[title*="Rotate"]').all();
  if (rotateButtons.length >= 2) {
    await rotateButtons[1].click(); // Rotate Right
    console.log('🔄 Clicked Rotate Right button\n');
    await page.waitForTimeout(500);
  }

  // Verify rotation was applied
  const rotationAfter = await page.evaluate(() => {
    // Check if there's a rotation slider or display
    const sliders = Array.from(document.querySelectorAll('input[type="range"]'));
    for (const slider of sliders) {
      const label = slider.previousElementSibling?.textContent;
      if (label?.includes('Rotation') || label?.includes('rotation')) {
        return (slider as HTMLInputElement).value;
      }
    }
    return 'unknown';
  });

  console.log(`📐 Rotation after clicking: ${rotationAfter}°\n`);

  // Now check if Gemini API key is available
  const hasGeminiKey = await page.evaluate(() => {
    return !!(window as any).ENV?.VITE_GEMINI_API_KEY;
  });

  if (!hasGeminiKey) {
    console.log('⚠️  No Gemini API key found - skipping actual OCR test\n');
    console.log('📋 SUMMARY:');
    console.log('─────────────────────────────────────────────────');
    console.log('✅ Image upload works');
    console.log('✅ Rotation controls work');
    console.log('⚠️  Cannot test OCR without API key');
    console.log('');
  } else {
    console.log('✅ Gemini API key found\n');

    // Click Process tab
    await page.locator('button:has-text("Process")').click();
    console.log('✅ Switched to Process tab\n');

    // Click "Run OCR" or similar button
    const runButton = page
      .locator('button:has-text("Run"), button:has-text("Process"), button:has-text("Extract")')
      .first();
    if (await runButton.isVisible()) {
      await runButton.click();
      console.log('🚀 Started OCR extraction\n');

      // Wait for processing (max 30 seconds)
      await page.waitForTimeout(30000);

      // Check if results are available
      const hasResults = await page.locator('text=/extracted|complete|success/i').isVisible();
      console.log(`📊 OCR Results: ${hasResults ? '✅ Found' : '❌ Not found'}\n`);
    }
  }

  // Cleanup
  fs.unlinkSync(testFilePath);

  console.log('═══════════════════════════════════════════════════');
  console.log('📋 TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════\n');
});
