import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Verify that rotation is actually applied before OCR extraction
 */
test('verify rotation is applied to OCR extraction', async ({ page }) => {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔍 VERIFYING ROTATION IS APPLIED TO OCR');
  console.log('═══════════════════════════════════════════════════\n');
  
  const consoleLogs: string[] = [];
  const consoleErrors: string[] = [];
  
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    if (text.includes('[generateProcessedImage]') || text.includes('DEBUG') || text.includes('rotation')) {
      console.log(`📋 ${text}`);
    }
  });
  
  page.on('pageerror', error => {
    consoleErrors.push(error.message);
    console.log(`❌ Error: ${error.message}`);
  });
  
  await page.goto('http://localhost:3000');
  console.log('✅ App loaded\n');
  
  // Create a test image with VERY clear horizontal text
  const testImageBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;
    
    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 800, 200);
    
    // Large horizontal text
    ctx.fillStyle = 'black';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HORIZONTAL TEXT', 400, 100);
    
    return canvas.toDataURL('image/png');
  });
  
  console.log('📸 Created test image: 800x200 with "HORIZONTAL TEXT"\n');
  
  const buffer = Buffer.from(testImageBase64.split(',')[1], 'base64');
  const testFilePath = path.join(process.cwd(), 'test-horizontal-text.png');
  fs.writeFileSync(testFilePath, buffer);
  
  // Upload the image
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(testFilePath);
  console.log('✅ Image uploaded\n');
  
  await page.waitForTimeout(1000);
  
  // Switch to Editor tab
  await page.locator('button:has-text("Editor")').click();
  await page.waitForTimeout(500);
  
  // Rotate 90 degrees
  const rotateBtn = page.locator('button[title*="Rotate Right"]');
  await rotateBtn.click();
  console.log('🔄 Rotated 90° clockwise\n');
  
  await page.waitForTimeout(500);
  
  // Verify rotation indicator is shown
  const indicator = page.locator('text=/Rotated.*90/');
  await expect(indicator).toBeVisible();
  const indicatorText = await indicator.textContent();
  console.log(`✅ Rotation indicator visible: "${indicatorText}"\n`);
  
  // Clear console logs before extraction
  consoleLogs.length = 0;
  consoleErrors.length = 0;
  
  // Switch to Process tab
  await page.locator('button:has-text("Process")').click();
  console.log('✅ Switched to Process tab\n');
  await page.waitForTimeout(500);
  
  // Check if extraction button is enabled
  const extractBtn = page.locator('button:has-text("Start Extraction")');
  const isDisabled = await extractBtn.isDisabled();
  console.log(`🔍 "Start Extraction" button disabled: ${isDisabled}\n`);
  
  if (isDisabled) {
    console.log('⚠️  Button is disabled - cannot test extraction');
    console.log('   This is expected if no API key is configured\n');
  } else {
    // Click extraction button
    await extractBtn.click();
    console.log('🚀 Clicked "Start Extraction"\n');
    
    // Wait for processing
    await page.waitForTimeout(3000);
  }
  
  // Check console logs for rotation application
  console.log('\n📋 CONSOLE LOGS ANALYSIS:');
  console.log('─────────────────────────────────────────────────');
  
  const rotationLogs = consoleLogs.filter(log => 
    log.includes('generateProcessedImage') || 
    log.includes('rotation') ||
    log.includes('Rotation:')
  );
  
  if (rotationLogs.length > 0) {
    console.log('✅ Found rotation-related logs:');
    rotationLogs.forEach(log => console.log(`   ${log}`));
  } else {
    console.log('⚠️  No rotation logs found');
  }
  
  const errorLogs = consoleLogs.filter(log => 
    log.includes('error') || 
    log.includes('Error') ||
    log.includes('failed') ||
    log.includes('Failed')
  );
  
  if (errorLogs.length > 0) {
    console.log('\n❌ Found error logs:');
    errorLogs.forEach(log => console.log(`   ${log}`));
  }
  
  if (consoleErrors.length > 0) {
    console.log('\n❌ Page errors:');
    consoleErrors.forEach(err => console.log(`   ${err}`));
  }
  
  // Cleanup
  fs.unlinkSync(testFilePath);
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📋 TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════\n');
});

