import { test, expect } from '@playwright/test';

test.describe('DockerOCR Dashboard', () => {
  test('should load the app without errors', async ({ page }) => {
    const errors: string[] = [];
    const consoleMessages: string[] = [];

    // Capture console messages
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(`[${msg.type()}] ${text}`);
      console.log(`Browser console [${msg.type()}]:`, text);
    });

    // Capture page errors
    page.on('pageerror', error => {
      errors.push(error.message);
      console.error('Page error:', error.message);
    });

    // Navigate to the app
    await page.goto('http://localhost:3000');

    // Wait for the app to load
    await page.waitForSelector('header', { timeout: 10000 });

    // Check if error boundary is shown
    const errorBoundary = await page.locator('text=Something went wrong').count();
    
    if (errorBoundary > 0) {
      const errorMessage = await page.locator('.text-red-400').textContent();
      console.error('Error Boundary shown with message:', errorMessage);
      
      // Print all console messages
      console.log('\n=== All Console Messages ===');
      consoleMessages.forEach(msg => console.log(msg));
      
      // Print all errors
      console.log('\n=== All Errors ===');
      errors.forEach(err => console.log(err));
      
      throw new Error(`App failed to load: ${errorMessage}`);
    }

    // Verify the app loaded successfully
    await expect(page.locator('text=DockerOCR')).toBeVisible();

    console.log('\n✅ App loaded successfully!');
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Total errors: ${errors.length}`);

    // Print render count
    const renderLogs = consoleMessages.filter(msg => msg.includes('[App] Render'));
    console.log(`\nRender count: ${renderLogs.length}`);
    renderLogs.forEach(log => console.log(log));
  });

  test('should handle state changes without hooks errors', async ({ page }) => {
    const errors: string[] = [];
    const consoleMessages: string[] = [];
    const renderCounts: number[] = [];

    // Capture console messages
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(`[${msg.type()}] ${text}`);
      console.log(`Browser console [${msg.type()}]:`, text);

      // Track render counts
      if (text.includes('[App] Render')) {
        renderCounts.push(Date.now());
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      errors.push(error.message);
      console.error('❌ Page error:', error.message);
      console.error('Stack:', error.stack);
    });

    // Navigate to the app
    await page.goto('http://localhost:3000');
    await page.waitForSelector('header', { timeout: 10000 });

    // Check initial state
    console.log('\n=== Initial Load ===');
    const initialErrorBoundary = await page.locator('text=Something went wrong').count();
    expect(initialErrorBoundary).toBe(0);
    console.log(`Initial renders: ${renderCounts.length}`);

    // Simulate user interactions that cause state changes
    console.log('\n=== Testing State Changes ===');

    // Click help button to trigger state change
    const helpButton = page.locator('button[title*="Help"]');
    await helpButton.click();
    await page.waitForTimeout(500);

    console.log(`Renders after help click: ${renderCounts.length}`);

    // Close help modal
    const closeButton = page.locator('button:has-text("Close")');
    if (await closeButton.count() > 0) {
      await closeButton.click();
      await page.waitForTimeout(500);
    }

    console.log(`Renders after help close: ${renderCounts.length}`);

    // Wait to see if any delayed errors occur
    await page.waitForTimeout(2000);

    // Check if error boundary appeared
    const errorBoundaryAfter = await page.locator('text=Something went wrong').count();

    if (errorBoundaryAfter > 0) {
      const errorMessage = await page.locator('.text-red-400').textContent();
      console.error('❌ Error Boundary shown:', errorMessage);

      // Print all console messages
      console.log('\n=== All Console Messages ===');
      consoleMessages.forEach(msg => console.log(msg));

      // Print all errors
      console.log('\n=== All Errors ===');
      errors.forEach(err => console.log(err));

      // Check for hooks error
      const hasHooksError = errors.some(err => err.includes('hooks') || err.includes('Rendered more'));
      if (hasHooksError) {
        console.error('\n❌ HOOKS ERROR DETECTED!');
      }

      throw new Error(`App crashed: ${errorMessage}`);
    }

    console.log('\n✅ App remained stable through state changes!');
    console.log(`Total renders: ${renderCounts.length}`);
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Total errors: ${errors.length}`);

    // Analyze render patterns
    if (renderCounts.length > 2) {
      console.log('\n=== Render Pattern Analysis ===');
      for (let i = 1; i < renderCounts.length; i++) {
        const timeDiff = renderCounts[i] - renderCounts[i-1];
        console.log(`Render ${i} -> ${i+1}: ${timeDiff}ms`);
      }
    }
  });
});

