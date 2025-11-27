import { test } from '@playwright/test';
import * as path from 'path';

/**
 * Test HEIC file rotation and OCR extraction
 */
test('test HEIC file rotation and extraction', async ({ page }) => {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔍 TESTING HEIC FILE ROTATION AND EXTRACTION');
  console.log('═══════════════════════════════════════════════════\n');

  const consoleLogs: string[] = [];
  const consoleErrors: string[] = [];

  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push(text);
    if (
      text.includes('[generateProcessedImage]') ||
      text.includes('DEBUG') ||
      text.includes('rotation') ||
      text.includes('HEIC') ||
      text.includes('conversion')
    ) {
      console.log(`📋 ${text}`);
    }
  });

  page.on('pageerror', (error) => {
    consoleErrors.push(error.message);
    console.log(`❌ Error: ${error.message}`);
  });

  await page.goto('http://localhost:3000');
  console.log('✅ App loaded\n');

  // Upload the HEIC file
  const heicFilePath = path.join('/home/owner/Downloads', 'IMG_0372.heic');
  console.log(`📁 Uploading HEIC file: ${heicFilePath}\n`);

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(heicFilePath);
  console.log('✅ HEIC file uploaded\n');

  // Wait for HEIC conversion
  console.log('⏳ Waiting for HEIC conversion...\n');
  await page.waitForTimeout(5000);

  // Check if conversion completed
  const conversionSuccess = await page.locator('text=/conversion complete/i').count();
  if (conversionSuccess > 0) {
    console.log('✅ HEIC conversion completed\n');
  } else {
    console.log('⚠️  HEIC conversion status unknown - checking logs\n');
  }

  // Switch to Editor tab
  await page.locator('button:has-text("Editor")').click();
  console.log('✅ Switched to Editor tab\n');
  await page.waitForTimeout(1000);

  // Check if rotation buttons are enabled
  const rotateBtn = page.locator('button[title*="Rotate Right"]');
  const isDisabled = await rotateBtn.isDisabled();
  console.log(`🔍 Rotate button disabled: ${isDisabled}\n`);

  if (isDisabled) {
    console.log('⚠️  Rotation disabled - HEIC conversion may have failed\n');
    console.log('📋 Checking process logs...\n');

    const logs = await page.locator('.log-entry, [class*="log"]').allTextContents();
    logs.forEach((log) => {
      if (log.trim()) {
        console.log(`   ${log.trim()}`);
      }
    });
  } else {
    // Rotate 90 degrees
    await rotateBtn.click();
    console.log('🔄 Rotated 90° clockwise\n');
    await page.waitForTimeout(500);

    // Verify rotation indicator
    const indicator = page.locator('text=/Rotated.*90/');
    const indicatorVisible = await indicator.isVisible();
    if (indicatorVisible) {
      const indicatorText = await indicator.textContent();
      console.log(`✅ Rotation indicator: "${indicatorText}"\n`);
    }

    // Clear console logs
    consoleLogs.length = 0;

    // Switch to Process tab
    await page.locator('button:has-text("Process")').click();
    console.log('✅ Switched to Process tab\n');
    await page.waitForTimeout(500);

    // Select PaddleOCR engine
    const engineSelect = page.locator('select');
    await engineSelect.selectOption('PADDLE');
    console.log('✅ Selected PaddleOCR engine\n');
    await page.waitForTimeout(500);

    // Check if extraction button is enabled
    const extractBtn = page.locator('button:has-text("Start Extraction")');
    const extractDisabled = await extractBtn.isDisabled();
    console.log(`🔍 "Start Extraction" button disabled: ${extractDisabled}\n`);

    if (!extractDisabled) {
      // Click extraction
      await extractBtn.click();
      console.log('🚀 Started OCR extraction\n');

      // Wait for processing
      await page.waitForTimeout(8000);

      // Check console logs for rotation
      console.log('\n📋 CONSOLE LOGS ANALYSIS:');
      console.log('─────────────────────────────────────────────────');

      const rotationLogs = consoleLogs.filter(
        (log) =>
          log.includes('generateProcessedImage') ||
          log.includes('Canvas:') ||
          log.includes('rotation')
      );

      if (rotationLogs.length > 0) {
        console.log('✅ Rotation logs found:');
        rotationLogs.forEach((log) => console.log(`   ${log}`));
      } else {
        console.log('⚠️  No rotation logs found');
      }

      // Check for errors
      const errorLogs = consoleLogs.filter(
        (log) => log.toLowerCase().includes('error') || log.toLowerCase().includes('failed')
      );

      if (errorLogs.length > 0) {
        console.log('\n❌ Error logs:');
        errorLogs.forEach((log) => console.log(`   ${log}`));
      }

      // Get process logs from UI
      console.log('\n📋 PROCESS LOGS:');
      console.log('─────────────────────────────────────────────────');
      const processLogs = await page.locator('.log-entry, [class*="log"], pre').allTextContents();
      processLogs.slice(-10).forEach((log) => {
        if (log.trim()) {
          console.log(`   ${log.trim()}`);
        }
      });
    }
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('📋 TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════\n');
});
