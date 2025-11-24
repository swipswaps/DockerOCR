import { test } from '@playwright/test';
import * as fs from 'fs';

test('Test rotation and OCR extraction', async ({ page }) => {
  console.log('\n📐 ROTATION + OCR EXTRACTION TEST');
  console.log('═══════════════════════════════════════════════════');

  await page.goto('http://localhost:3001/');
  await page.waitForLoadState('networkidle');
  console.log('✅ App loaded');

  // Upload HEIC file
  const heicPath = '/home/owner/Downloads/IMG_0372.heic';
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(heicPath);
  console.log('✅ HEIC file uploaded');

  // Wait for HEIC conversion
  await page.waitForTimeout(3000);
  console.log('✅ HEIC conversion completed');

  // Click rotate left button (using title attribute)
  const rotateLeftButton = page.locator('button[title*="Rotate Left"]').first();
  await rotateLeftButton.click();
  console.log('✅ Clicked Rotate Left (270°)');

  await page.waitForTimeout(500);

  // Check filter state
  const filterState = await page.evaluate(() => {
    return (window as any).__currentFilters || 'not available';
  });
  console.log('📊 Filter state:', filterState);

  // Switch to Process tab
  await page.click('button:has-text("Process")');
  console.log('✅ Switched to Process tab');

  // Start extraction
  const extractButton = page.locator('button:has-text("Start Extraction")');
  await extractButton.click();
  console.log('🚀 Started OCR extraction');

  // Wait for extraction to complete
  await page.waitForTimeout(8000);

  // Capture app messages
  const messages = await page.evaluate(() => {
    const logElements = document.querySelectorAll('.text-xs.font-mono');
    return Array.from(logElements).map(el => el.textContent?.trim()).filter(Boolean);
  });

  console.log('\n📋 APP MESSAGES:');
  console.log('─────────────────────────────────────────────────');
  messages.forEach(msg => console.log('  ', msg));
  console.log('─────────────────────────────────────────────────');

  // Check if rotation was applied
  const rotationApplied = messages.some(msg => 
    msg?.includes('rotated 270°') || msg?.includes('rotation=270')
  );
  console.log(`\n🔄 Rotation applied: ${rotationApplied ? 'YES' : 'NO'}`);

  // Get the image sent to OCR
  const sentToOCR = await page.evaluate(() => {
    return (window as any).__sentToOCR || null;
  });

  if (sentToOCR) {
    // Save the image
    const base64Data = sentToOCR.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync('sent-to-ocr-rotated.jpg', buffer);
    console.log('✅ Saved sent-to-ocr-rotated.jpg');
    
    // Get dimensions using sharp or just file size
    console.log(`📏 File size: ${Math.round(buffer.length / 1024)}KB`);
  } else {
    console.log('❌ No image found in window.__sentToOCR');
  }

  console.log('═══════════════════════════════════════════════════');
  console.log('✅ TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════\n');
});

