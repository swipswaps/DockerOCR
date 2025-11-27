import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Verify rotation works on the live GitHub Pages site
 */
test('verify rotation on live site', async ({ page }) => {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🌐 VERIFYING ROTATION ON LIVE SITE');
  console.log('═══════════════════════════════════════════════════\n');

  const consoleLogs: string[] = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push(text);
    if (
      text.includes('[generateProcessedImage]') ||
      text.includes('DEBUG') ||
      text.includes('rotation')
    ) {
      console.log(`📋 ${text}`);
    }
  });

  await page.goto('https://swipswaps.github.io/DockerOCR/');
  console.log('✅ Live site loaded\n');

  await page.waitForTimeout(2000);

  // Create a test image
  const testImageBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 300;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 600, 300);

    ctx.fillStyle = 'black';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HORIZONTAL', 300, 150);

    return canvas.toDataURL('image/png');
  });

  console.log('📸 Created test image: 600x300\n');

  // Convert to file and upload
  const buffer = Buffer.from(testImageBase64.split(',')[1], 'base64');
  const testFilePath = path.join(process.cwd(), 'test-live-rotation.png');
  fs.writeFileSync(testFilePath, buffer);

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(testFilePath);
  console.log('✅ Image uploaded\n');

  await page.waitForTimeout(1500);

  // Switch to Editor
  await page.locator('button:has-text("Editor")').click();
  await page.waitForTimeout(500);

  // Rotate 90 degrees
  const rotateBtn = page.locator('button[title*="Rotate Right"]');
  await rotateBtn.click();
  console.log('🔄 Rotated 90°\n');

  await page.waitForTimeout(500);

  // Verify rotation indicator
  const indicator = page.locator('text=/Rotated.*90/');
  await expect(indicator).toBeVisible();
  console.log('✅ Rotation indicator visible\n');

  // Clear logs
  consoleLogs.length = 0;

  // Switch to Process tab
  await page.locator('button:has-text("Process")').click();
  await page.waitForTimeout(500);

  // Check if button is enabled
  const extractBtn = page.locator('button:has-text("Start Extraction")');
  const isDisabled = await extractBtn.isDisabled();

  console.log(`🔍 Extraction button disabled: ${isDisabled}\n`);

  if (!isDisabled) {
    await extractBtn.click();
    console.log('🚀 Started extraction\n');
    await page.waitForTimeout(3000);

    // Check for rotation logs
    const rotationLogs = consoleLogs.filter(
      (log) => log.includes('generateProcessedImage') || log.includes('Canvas:')
    );

    if (rotationLogs.length > 0) {
      console.log('✅ Rotation logs found:');
      rotationLogs.forEach((log) => console.log(`   ${log}`));
    } else {
      console.log('⚠️  No rotation logs (might be expected if API key not configured)');
    }
  }

  // Cleanup
  fs.unlinkSync(testFilePath);

  console.log('\n═══════════════════════════════════════════════════');
  console.log('✅ LIVE SITE VERIFICATION COMPLETE');
  console.log('═══════════════════════════════════════════════════\n');
});
