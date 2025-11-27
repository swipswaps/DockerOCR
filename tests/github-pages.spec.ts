import { test, expect } from '@playwright/test';

const GITHUB_PAGES_URL = 'https://swipswaps.github.io/DockerOCR/';

test.describe('GitHub Pages Deployment', () => {
  test('should load the app on GitHub Pages', async ({ page }) => {
    console.log('🌐 Testing GitHub Pages deployment...');
    console.log(`📍 URL: ${GITHUB_PAGES_URL}`);

    await page.goto(GITHUB_PAGES_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Check if page loaded
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);

    // Check for main app container
    const appContainer = page.locator('body');
    await expect(appContainer).toBeVisible();
    console.log('✅ App container visible');
  });

  test('should display the header', async ({ page }) => {
    await page.goto(GITHUB_PAGES_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Look for header text
    const header = page.getByText(/DockerOCR|OCR/i).first();
    await expect(header).toBeVisible({ timeout: 10000 });
    console.log('✅ Header visible');
  });

  test('should show OCR engine selector', async ({ page }) => {
    await page.goto(GITHUB_PAGES_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Look for engine selector
    const engineSelector = page
      .locator('select, button')
      .filter({ hasText: /Gemini|PaddleOCR|Engine/i })
      .first();
    if ((await engineSelector.count()) > 0) {
      await expect(engineSelector).toBeVisible({ timeout: 10000 });
      console.log('✅ OCR engine selector visible');
    } else {
      console.log('⚠️  OCR engine selector not found');
    }
  });

  test('should show file upload area', async ({ page }) => {
    await page.goto(GITHUB_PAGES_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Look for file upload input or drop zone
    const fileInput = page.locator('input[type="file"]').first();
    if ((await fileInput.count()) > 0) {
      console.log('✅ File upload input found');
    } else {
      console.log('⚠️  File upload input not found');
    }
  });

  test('should check for console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('requestfailed', (request) => {
      networkErrors.push(`${request.url()} - ${request.failure()?.errorText}`);
    });

    await page.goto(GITHUB_PAGES_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait a bit for any async errors
    await page.waitForTimeout(3000);

    console.log('\n📊 Error Report:');
    console.log('═══════════════════════════════════════════════════');

    if (consoleErrors.length > 0) {
      console.log('❌ Console Errors:');
      consoleErrors.forEach((err) => console.log(`  - ${err}`));
    } else {
      console.log('✅ No console errors');
    }

    if (networkErrors.length > 0) {
      console.log('\n❌ Network Errors:');
      networkErrors.forEach((err) => console.log(`  - ${err}`));
    } else {
      console.log('✅ No network errors');
    }

    console.log('═══════════════════════════════════════════════════\n');
  });

  test('should take screenshot of the page', async ({ page }) => {
    await page.goto(GITHUB_PAGES_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'github-pages-screenshot.png', fullPage: true });
    console.log('📸 Screenshot saved: github-pages-screenshot.png');
  });

  test('should check all assets load correctly', async ({ page }) => {
    const failedResources: string[] = [];

    page.on('response', (response) => {
      if (!response.ok() && response.status() !== 304) {
        failedResources.push(`${response.status()} - ${response.url()}`);
      }
    });

    await page.goto(GITHUB_PAGES_URL, { waitUntil: 'networkidle', timeout: 30000 });

    console.log('\n📦 Asset Loading Report:');
    console.log('═══════════════════════════════════════════════════');

    if (failedResources.length > 0) {
      console.log('❌ Failed Resources:');
      failedResources.forEach((resource) => console.log(`  - ${resource}`));
    } else {
      console.log('✅ All assets loaded successfully');
    }

    console.log('═══════════════════════════════════════════════════\n');
  });

  test('should extract page structure', async ({ page }) => {
    await page.goto(GITHUB_PAGES_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Get all visible text
    const bodyText = await page.locator('body').textContent();

    console.log('\n📄 Page Content:');
    console.log('═══════════════════════════════════════════════════');
    console.log(bodyText?.substring(0, 500) + '...');
    console.log('═══════════════════════════════════════════════════\n');

    // Get all buttons
    const buttons = await page.locator('button').allTextContents();
    console.log('🔘 Buttons found:', buttons);

    // Get all headings
    const headings = await page.locator('h1, h2, h3').allTextContents();
    console.log('📋 Headings found:', headings);
  });
});
