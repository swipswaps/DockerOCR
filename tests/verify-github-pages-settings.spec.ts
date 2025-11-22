import { test, expect } from '@playwright/test';

/**
 * This test verifies GitHub Pages settings and guides you through the fix
 */
test.describe('GitHub Pages Settings Verification', () => {
  test('check GitHub Pages settings page', async ({ page }) => {
    const settingsUrl = 'https://github.com/swipswaps/DockerOCR/settings/pages';
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('🔍 CHECKING GITHUB PAGES SETTINGS');
    console.log('═══════════════════════════════════════════════════');
    console.log(`📍 URL: ${settingsUrl}`);
    
    await page.goto(settingsUrl, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Take screenshot
    await page.screenshot({ path: 'github-pages-settings.png', fullPage: true });
    console.log('📸 Screenshot saved: github-pages-settings.png');
    
    // Get page content
    const bodyText = await page.locator('body').textContent();
    
    console.log('\n📄 Page Content Analysis:');
    console.log('─────────────────────────────────────────────────');
    
    // Check for key indicators
    if (bodyText?.includes('GitHub Actions')) {
      console.log('✅ "GitHub Actions" text found on page');
    } else {
      console.log('❌ "GitHub Actions" text NOT found');
    }
    
    if (bodyText?.includes('Source')) {
      console.log('✅ "Source" section found');
    } else {
      console.log('❌ "Source" section NOT found');
    }
    
    if (bodyText?.includes('Build and deployment')) {
      console.log('✅ "Build and deployment" section found');
    } else {
      console.log('❌ "Build and deployment" section NOT found');
    }
    
    // Look for dropdown/select elements
    const selects = await page.locator('select').count();
    console.log(`\n🔘 Found ${selects} dropdown(s) on page`);
    
    if (selects > 0) {
      for (let i = 0; i < selects; i++) {
        const select = page.locator('select').nth(i);
        const options = await select.locator('option').allTextContents();
        console.log(`\nDropdown ${i + 1} options:`, options);
      }
    }
    
    // Look for buttons
    const buttons = await page.locator('button').allTextContents();
    console.log(`\n🔘 Buttons found:`, buttons.filter(b => b.trim()));
    
    // Look for any error messages
    if (bodyText?.includes('not found') || bodyText?.includes('404')) {
      console.log('\n❌ ERROR: Page shows 404 or "not found"');
    }
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📋 INSTRUCTIONS TO FIX:');
    console.log('═══════════════════════════════════════════════════');
    console.log('1. Open: https://github.com/swipswaps/DockerOCR/settings/pages');
    console.log('2. Under "Build and deployment"');
    console.log('3. Set "Source" to: GitHub Actions');
    console.log('4. Save the changes');
    console.log('5. Wait 1-2 minutes for deployment');
    console.log('6. Visit: https://swipswaps.github.io/DockerOCR/');
    console.log('═══════════════════════════════════════════════════\n');
  });
  
  test('compare with working CSV-to-XLSX-Converter deployment', async ({ page }) => {
    const workingUrl = 'https://swipswaps.github.io/CSV-to-XLSX-Converter/';
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ TESTING WORKING DEPLOYMENT');
    console.log('═══════════════════════════════════════════════════');
    console.log(`📍 URL: ${workingUrl}`);
    
    await page.goto(workingUrl, { waitUntil: 'networkidle', timeout: 30000 });
    
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
    
    // Check if it loaded successfully
    const bodyText = await page.locator('body').textContent();
    
    if (bodyText?.includes('404') || bodyText?.includes('not found')) {
      console.log('❌ Working site shows 404!');
    } else {
      console.log('✅ Working site loaded successfully');
      
      // Take screenshot
      await page.screenshot({ path: 'working-deployment.png', fullPage: true });
      console.log('📸 Screenshot saved: working-deployment.png');
    }
    
    console.log('═══════════════════════════════════════════════════\n');
  });
});

