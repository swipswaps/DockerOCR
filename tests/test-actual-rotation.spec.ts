import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test actual rotation with a real image upload
 */
test('test actual rotation with real image', async ({ page }) => {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔍 TESTING ACTUAL ROTATION WITH REAL IMAGE');
  console.log('═══════════════════════════════════════════════════\n');
  
  // Capture ALL console logs
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    console.log(`📋 Console: ${text}`);
  });
  
  // Capture console errors
  page.on('pageerror', error => {
    console.log(`❌ Page Error: ${error.message}`);
  });
  
  // Navigate to the app
  await page.goto('http://localhost:3000');
  console.log('✅ App loaded\n');
  
  // Create a test image with VERY clear orientation
  const testImageBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 300;
    const ctx = canvas.getContext('2d')!;
    
    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 600, 300);
    
    // Draw large horizontal text
    ctx.fillStyle = 'black';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HORIZONTAL', 300, 150);
    
    // Draw arrow pointing right
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(50, 150);
    ctx.lineTo(550, 150);
    ctx.lineTo(520, 120);
    ctx.moveTo(550, 150);
    ctx.lineTo(520, 180);
    ctx.stroke();
    
    return canvas.toDataURL('image/png');
  });
  
  console.log('📸 Created test image: 600x300 with "HORIZONTAL" text\n');
  
  // Save and upload
  const buffer = Buffer.from(testImageBase64.split(',')[1], 'base64');
  const testFilePath = path.join(process.cwd(), 'test-horizontal.png');
  fs.writeFileSync(testFilePath, buffer);
  
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(testFilePath);
  console.log('✅ Image uploaded\n');
  
  await page.waitForTimeout(1500);
  
  // Switch to Editor
  await page.locator('button:has-text("Editor")').click();
  await page.waitForTimeout(500);
  
  // Rotate 90 degrees
  const rotateRightBtn = page.locator('button[title*="Rotate Right"]');
  await rotateRightBtn.click();
  console.log('🔄 Clicked Rotate Right (90°)\n');
  
  await page.waitForTimeout(500);
  
  // Check rotation indicator
  const indicator = await page.locator('text=/Rotated.*90/').textContent();
  console.log(`📐 Rotation indicator: "${indicator}"\n`);
  
  // Switch to Process tab
  await page.locator('button:has-text("Process")').click();
  console.log('✅ Switched to Process tab\n');
  await page.waitForTimeout(500);
  
  // Clear console logs
  consoleLogs.length = 0;
  
  // Check if Gemini API key is available
  const hasApiKey = await page.evaluate(() => {
    return !!(window as any).ENV?.VITE_GEMINI_API_KEY;
  });

  console.log(`🔑 Gemini API key available: ${hasApiKey}\n`);

  if (!hasApiKey) {
    console.log('⚠️  Cannot test OCR without API key - skipping extraction\n');
    fs.unlinkSync(testFilePath);
    return;
  }

  // Click "Start Extraction" button
  const runButton = page.locator('button:has-text("Start Extraction")');
  const buttonExists = await runButton.count();
  console.log(`🔍 "Start Extraction" button found: ${buttonExists > 0}\n`);

  if (buttonExists === 0) {
    console.log('❌ Button not found - listing all buttons:\n');
    const allButtons = await page.locator('button').all();
    for (const btn of allButtons) {
      const text = await btn.textContent();
      if (text?.trim()) {
        console.log(`   - "${text.trim()}"`);
      }
    }
    fs.unlinkSync(testFilePath);
    return;
  }

  await runButton.click();
  console.log('🚀 Clicked "Start Extraction"\n');
  
  // Wait for processing
  await page.waitForTimeout(5000);
  
  // Get all process logs from UI
  const processLogs = await page.locator('.log-entry, [class*="log"], pre').allTextContents();
  
  console.log('\n📋 PROCESS LOGS FROM UI:');
  console.log('─────────────────────────────────────────────────');
  processLogs.forEach(log => {
    if (log.trim()) {
      console.log(`  ${log.trim()}`);
    }
  });
  
  console.log('\n📋 CONSOLE LOGS:');
  console.log('─────────────────────────────────────────────────');
  const relevantLogs = consoleLogs.filter(log => 
    log.includes('generateProcessedImage') || 
    log.includes('DEBUG') ||
    log.includes('rotation') ||
    log.includes('Canvas:') ||
    log.includes('Error') ||
    log.includes('error')
  );
  
  if (relevantLogs.length > 0) {
    relevantLogs.forEach(log => console.log(`  ${log}`));
  } else {
    console.log('  ⚠️  No relevant console logs found');
    console.log('\n  ALL CONSOLE LOGS:');
    consoleLogs.forEach(log => console.log(`    ${log}`));
  }
  
  // Cleanup
  fs.unlinkSync(testFilePath);
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📋 TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════\n');
});

