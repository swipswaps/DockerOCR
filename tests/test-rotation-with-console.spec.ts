import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test rotation with console logging to debug the issue
 */
test('test rotation with console logging', async ({ page }) => {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔍 TESTING ROTATION WITH CONSOLE LOGGING');
  console.log('═══════════════════════════════════════════════════\n');

  // Capture console logs
  const consoleLogs: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push(text);
    if (
      text.includes('[generateProcessedImage]') ||
      text.includes('rotation') ||
      text.includes('filters')
    ) {
      console.log(`📋 Console: ${text}`);
    }
  });

  // Navigate to the app
  await page.goto('http://localhost:3000');
  console.log('✅ App loaded\n');

  // Create a test image with clear orientation
  const testImageBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    const ctx = canvas.getContext('2d')!;

    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 800, 400);

    // Draw "TOP" at the top
    ctx.fillStyle = 'red';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TOP', 400, 80);

    // Draw "BOTTOM" at the bottom
    ctx.fillStyle = 'blue';
    ctx.fillText('BOTTOM', 400, 360);

    // Draw "LEFT" on the left
    ctx.fillStyle = 'green';
    ctx.save();
    ctx.translate(80, 200);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('LEFT', 0, 0);
    ctx.restore();

    // Draw "RIGHT" on the right
    ctx.fillStyle = 'purple';
    ctx.save();
    ctx.translate(720, 200);
    ctx.rotate(Math.PI / 2);
    ctx.fillText('RIGHT', 0, 0);
    ctx.restore();

    return canvas.toDataURL('image/png');
  });

  console.log('📸 Created test image with orientation markers\n');

  // Save and upload the test image
  const buffer = Buffer.from(testImageBase64.split(',')[1], 'base64');
  const testFilePath = path.join(process.cwd(), 'test-orientation-image.png');
  fs.writeFileSync(testFilePath, buffer);

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(testFilePath);

  console.log('✅ Test image uploaded\n');
  await page.waitForTimeout(1000);

  // Switch to Editor tab
  await page.locator('button:has-text("Editor")').click();
  console.log('✅ Switched to Editor tab\n');
  await page.waitForTimeout(500);

  // Click rotate right button
  const rotateButtons = await page
    .locator('button')
    .filter({ hasText: /rotate/i })
    .all();
  if (rotateButtons.length === 0) {
    // Try finding by title
    const rotateRightBtn = page.locator('button[title*="Rotate Right"]');
    if ((await rotateRightBtn.count()) > 0) {
      await rotateRightBtn.click();
      console.log('🔄 Clicked Rotate Right button (by title)\n');
    }
  } else {
    // Find the rotate right button (usually has IconRotate without transform)
    const allButtons = await page.locator('button').all();
    for (const btn of allButtons) {
      const title = await btn.getAttribute('title');
      if (title?.includes('Rotate Right')) {
        await btn.click();
        console.log('🔄 Clicked Rotate Right button\n');
        break;
      }
    }
  }

  await page.waitForTimeout(500);

  // Check if rotation indicator is visible
  const rotationIndicator = page.locator('text=/Rotated.*°/');
  const hasIndicator = await rotationIndicator.isVisible();
  console.log(`📐 Rotation indicator visible: ${hasIndicator}\n`);

  if (hasIndicator) {
    const indicatorText = await rotationIndicator.textContent();
    console.log(`   Text: "${indicatorText}"\n`);
  }

  // Switch to Process tab
  await page.locator('button:has-text("Process")').click();
  console.log('✅ Switched to Process tab\n');
  await page.waitForTimeout(500);

  // Clear console logs before processing
  consoleLogs.length = 0;

  // Click "Run OCR" button
  const runButton = page
    .locator('button')
    .filter({ hasText: /run|process|extract/i })
    .first();
  if (await runButton.isVisible()) {
    console.log('🚀 Clicking Run OCR button...\n');
    await runButton.click();

    // Wait for processing to start
    await page.waitForTimeout(3000);

    // Check console logs
    console.log('\n📋 CONSOLE LOGS DURING PROCESSING:');
    console.log('─────────────────────────────────────────────────');
    const relevantLogs = consoleLogs.filter(
      (log) =>
        log.includes('generateProcessedImage') ||
        log.includes('rotation') ||
        log.includes('filters') ||
        log.includes('Canvas:') ||
        log.includes('Rotation:')
    );

    if (relevantLogs.length > 0) {
      relevantLogs.forEach((log) => console.log(`  ${log}`));
    } else {
      console.log('  ⚠️  No relevant console logs found');
    }
    console.log('');

    // Check process logs in the UI
    const processLogs = await page.locator('.log-entry, [class*="log"]').allTextContents();
    console.log('\n📋 PROCESS LOGS IN UI:');
    console.log('─────────────────────────────────────────────────');
    const rotationLogs = processLogs.filter(
      (log) => log.includes('rotation') || log.includes('Rotated') || log.includes('filters')
    );

    if (rotationLogs.length > 0) {
      rotationLogs.forEach((log) => console.log(`  ${log}`));
    } else {
      console.log('  ⚠️  No rotation-related logs found in UI');
    }
  }

  // Cleanup
  fs.unlinkSync(testFilePath);

  console.log('\n═══════════════════════════════════════════════════');
  console.log('📋 TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════\n');
});
