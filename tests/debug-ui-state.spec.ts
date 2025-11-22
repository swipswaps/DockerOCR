import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Debug UI state to see what's happening
 */
test('debug UI state after rotation', async ({ page }) => {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔍 DEBUGGING UI STATE');
  console.log('═══════════════════════════════════════════════════\n');
  
  await page.goto('http://localhost:3000');
  console.log('✅ App loaded\n');
  
  // Create test image
  const testImageBase64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 400, 200);
    ctx.fillStyle = 'black';
    ctx.font = 'bold 48px Arial';
    ctx.fillText('TEST', 50, 100);
    return canvas.toDataURL('image/png');
  });
  
  const buffer = Buffer.from(testImageBase64.split(',')[1], 'base64');
  const testFilePath = path.join(process.cwd(), 'test-debug.png');
  fs.writeFileSync(testFilePath, buffer);
  
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(testFilePath);
  console.log('✅ Image uploaded\n');
  
  await page.waitForTimeout(1000);
  
  // Check all buttons
  const allButtons = await page.locator('button').all();
  console.log(`📊 Found ${allButtons.length} buttons\n`);
  
  for (let i = 0; i < allButtons.length; i++) {
    const btn = allButtons[i];
    const text = await btn.textContent();
    const title = await btn.getAttribute('title');
    const disabled = await btn.isDisabled();
    const visible = await btn.isVisible();
    
    if (text?.trim() || title) {
      console.log(`Button ${i}: "${text?.trim() || ''}" title="${title || ''}" disabled=${disabled} visible=${visible}`);
    }
  }
  
  console.log('\n');
  
  // Switch to Editor
  await page.locator('button:has-text("Editor")').click();
  await page.waitForTimeout(500);
  
  // Rotate
  const rotateBtn = page.locator('button[title*="Rotate Right"]');
  await rotateBtn.click();
  console.log('🔄 Rotated\n');
  await page.waitForTimeout(500);
  
  // Check filters state
  const filtersState = await page.evaluate(() => {
    // Try to access React state (this might not work)
    const appElement = document.querySelector('#root');
    return {
      hasAppElement: !!appElement,
      rotationIndicator: document.querySelector('text=/Rotated/')?.textContent || 'not found'
    };
  });
  
  console.log('📊 Filters state:', JSON.stringify(filtersState, null, 2));
  console.log('\n');
  
  // Switch to Process tab
  await page.locator('button:has-text("Process")').click();
  await page.waitForTimeout(500);
  
  // Find all buttons again
  const processButtons = await page.locator('button').all();
  console.log(`📊 Buttons in Process tab:\n`);
  
  for (let i = 0; i < processButtons.length; i++) {
    const btn = processButtons[i];
    const text = await btn.textContent();
    const disabled = await btn.isDisabled();
    const visible = await btn.isVisible();
    
    if (visible && text?.trim()) {
      console.log(`  Button: "${text.trim()}" disabled=${disabled}`);
    }
  }
  
  console.log('\n');
  
  // Check if there's a "Run OCR" or similar button
  const runOCRButton = page.locator('button:has-text("Run OCR"), button:has-text("Run"), button:has-text("Extract"), button:has-text("Process")').first();
  const runButtonExists = await runOCRButton.count();
  console.log(`🔍 "Run OCR" button exists: ${runButtonExists > 0}`);
  
  if (runButtonExists > 0) {
    const runButtonText = await runOCRButton.textContent();
    const runButtonDisabled = await runOCRButton.isDisabled();
    const runButtonVisible = await runOCRButton.isVisible();
    console.log(`   Text: "${runButtonText}"`);
    console.log(`   Disabled: ${runButtonDisabled}`);
    console.log(`   Visible: ${runButtonVisible}`);
  }
  
  // Cleanup
  fs.unlinkSync(testFilePath);
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📋 DEBUG COMPLETE');
  console.log('═══════════════════════════════════════════════════\n');
});

