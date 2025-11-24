import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('HEIC Auto-Rotation Test', () => {
  test('should upload IMG_0372.heic and test auto-rotation with PaddleOCR', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3001');
    
    // Wait for app to load
    await page.waitForSelector('text=DockerOCR', { timeout: 10000 });
    
    console.log('✅ App loaded');
    
    // Select PaddleOCR engine
    const paddleButton = page.locator('button:has-text("PaddleOCR")');
    await paddleButton.click();
    console.log('✅ Selected PaddleOCR engine');
    
    // Wait a moment for engine selection
    await page.waitForTimeout(500);
    
    // Upload the HEIC file
    const heicPath = path.join(process.env.HOME || '', 'Downloads', 'IMG_0372.heic');
    
    if (!fs.existsSync(heicPath)) {
      throw new Error(`HEIC file not found at: ${heicPath}`);
    }
    
    console.log(`📁 Found HEIC file: ${heicPath}`);
    console.log(`📊 File size: ${(fs.statSync(heicPath).size / 1024 / 1024).toFixed(2)} MB`);
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(heicPath);
    
    console.log('✅ HEIC file uploaded');
    
    // Wait for HEIC conversion
    await page.waitForSelector('text=HEIC conversion complete', { timeout: 30000 });
    console.log('✅ HEIC conversion complete');
    
    // Check if auto-rotation toggle is visible and enabled
    const autoRotateToggle = page.locator('button').filter({ hasText: /Auto-Detect Rotation/ }).first();
    const isVisible = await autoRotateToggle.isVisible().catch(() => false);
    
    if (isVisible) {
      console.log('✅ Auto-rotation toggle is visible');
      
      // Check if it's enabled (should have green background)
      const toggleButton = page.locator('button.bg-emerald-600, button.bg-gray-600').first();
      const classes = await toggleButton.getAttribute('class');
      console.log(`🎨 Toggle classes: ${classes}`);
      
      if (classes?.includes('bg-emerald-600')) {
        console.log('✅ Auto-rotation is ENABLED');
      } else {
        console.log('⚠️ Auto-rotation is DISABLED - enabling it...');
        await toggleButton.click();
        await page.waitForTimeout(500);
      }
    } else {
      console.log('⚠️ Auto-rotation toggle not visible (might be using Gemini)');
    }
    
    // Start extraction
    const extractButton = page.locator('button:has-text("Start Extraction")');
    await extractButton.click();
    console.log('✅ Clicked Start Extraction');
    
    // Capture all log messages
    const logs: string[] = [];
    
    // Listen for log updates
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('INFO') || text.includes('SUCCESS') || text.includes('ERROR') || text.includes('WARN')) {
        logs.push(text);
        console.log(text);
      }
    });
    
    // Wait for extraction to complete or fail (up to 2 minutes)
    try {
      await page.waitForSelector('text=Extraction successful', { timeout: 120000 });
      console.log('✅ Extraction completed successfully');
    } catch (error) {
      console.log('❌ Extraction failed or timed out');
      
      // Check for error messages
      const errorText = await page.locator('text=/ERROR|Error|error/').first().textContent().catch(() => null);
      if (errorText) {
        console.log(`❌ Error message: ${errorText}`);
      }
      
      // Save screenshot for debugging
      await page.screenshot({ path: 'test-heic-auto-rotation-error.png', fullPage: true });
      console.log('📸 Screenshot saved: test-heic-auto-rotation-error.png');
      
      throw error;
    }
    
    // Analyze the logs
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📋 LOG ANALYSIS');
    console.log('═══════════════════════════════════════════════════');
    
    const rotationLogs = logs.filter(log => 
      log.includes('rotation') || 
      log.includes('Analyzing orientation') || 
      log.includes('Detected rotation')
    );
    
    console.log('\n🔄 Rotation-related logs:');
    rotationLogs.forEach(log => console.log(`  ${log}`));
    
    // Check for duplicate logs
    const duplicates = rotationLogs.filter((log, index, arr) => 
      arr.indexOf(log) !== index
    );
    
    if (duplicates.length > 0) {
      console.log('\n⚠️ DUPLICATE LOGS FOUND:');
      duplicates.forEach(log => console.log(`  ${log}`));
    } else {
      console.log('\n✅ No duplicate logs found');
    }
    
    // Save final screenshot
    await page.screenshot({ path: 'test-heic-auto-rotation-success.png', fullPage: true });
    console.log('\n📸 Screenshot saved: test-heic-auto-rotation-success.png');
  });
});

