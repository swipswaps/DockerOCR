import { test } from '@playwright/test';

/**
 * Actually inspect the GitHub Pages settings page with authentication
 */
test('inspect GitHub Pages settings with real interaction', async ({ page }) => {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔍 INSPECTING GITHUB PAGES SETTINGS PAGE');
  console.log('═══════════════════════════════════════════════════\n');

  const settingsUrl = 'https://github.com/swipswaps/DockerOCR/settings/pages';

  console.log(`📍 Navigating to: ${settingsUrl}\n`);

  await page.goto(settingsUrl, { waitUntil: 'networkidle', timeout: 30000 });

  // Take full page screenshot
  await page.screenshot({ path: 'pages-settings-full.png', fullPage: true });
  console.log('📸 Screenshot saved: pages-settings-full.png\n');

  // Get all text content
  const bodyText = await page.locator('body').textContent();

  // Check if we need to login
  if (bodyText?.includes('Sign in') || bodyText?.includes('Login')) {
    console.log('❌ NOT LOGGED IN - Need authentication');
    console.log('Please run this test with authenticated browser context\n');
    return;
  }

  console.log('✅ Page loaded (authenticated)\n');

  // Find all headings
  console.log('📋 HEADINGS ON PAGE:');
  console.log('─────────────────────────────────────────────────');
  const headings = await page.locator('h1, h2, h3, h4').allTextContents();
  headings.forEach((h, i) => console.log(`${i + 1}. ${h.trim()}`));
  console.log('');

  // Find "Build and deployment" section
  console.log('🔍 LOOKING FOR "Build and deployment" SECTION:');
  console.log('─────────────────────────────────────────────────');

  if (bodyText?.includes('Build and deployment')) {
    console.log('✅ Found "Build and deployment" section\n');

    // Find the Source dropdown/select
    console.log('🔍 LOOKING FOR SOURCE DROPDOWN:');
    console.log('─────────────────────────────────────────────────');

    // Check for select elements
    const selects = await page.locator('select').all();
    console.log(`Found ${selects.length} <select> element(s)\n`);

    for (let i = 0; i < selects.length; i++) {
      const select = selects[i];
      const isVisible = await select.isVisible();
      const name = await select.getAttribute('name');
      const id = await select.getAttribute('id');

      console.log(`Select ${i + 1}:`);
      console.log(`  Visible: ${isVisible}`);
      console.log(`  Name: ${name}`);
      console.log(`  ID: ${id}`);

      if (isVisible) {
        const options = await select.locator('option').allTextContents();
        console.log(`  Options: ${JSON.stringify(options)}`);

        const selectedOption = await select.locator('option[selected]').textContent();
        console.log(`  Currently selected: ${selectedOption}`);
      }
      console.log('');
    }

    // Check for buttons/links related to source
    console.log('🔍 LOOKING FOR BUTTONS/LINKS:');
    console.log('─────────────────────────────────────────────────');

    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} button(s)\n`);

    for (let i = 0; i < Math.min(buttons.length, 20); i++) {
      const button = buttons[i];
      const isVisible = await button.isVisible();
      if (isVisible) {
        const text = await button.textContent();
        if (text && text.trim()) {
          console.log(`Button ${i + 1}: "${text.trim()}"`);
        }
      }
    }
    console.log('');

    // Look for any text containing "GitHub Actions"
    console.log('🔍 SEARCHING FOR "GitHub Actions" TEXT:');
    console.log('─────────────────────────────────────────────────');

    const githubActionsElements = await page.locator('text=GitHub Actions').all();
    console.log(`Found ${githubActionsElements.length} element(s) containing "GitHub Actions"\n`);

    for (let i = 0; i < githubActionsElements.length; i++) {
      const elem = githubActionsElements[i];
      const tagName = await elem.evaluate((el) => el.tagName);
      const text = await elem.textContent();
      const isVisible = await elem.isVisible();

      console.log(`Element ${i + 1}:`);
      console.log(`  Tag: ${tagName}`);
      console.log(`  Text: ${text?.trim()}`);
      console.log(`  Visible: ${isVisible}`);
      console.log('');
    }
  } else {
    console.log('❌ "Build and deployment" section NOT found\n');
  }

  // Check for error messages
  console.log('🔍 CHECKING FOR ERROR MESSAGES:');
  console.log('─────────────────────────────────────────────────');

  const errorKeywords = ['error', 'failed', 'not found', 'invalid'];
  for (const keyword of errorKeywords) {
    if (bodyText?.toLowerCase().includes(keyword)) {
      console.log(`⚠️ Found keyword: "${keyword}"`);
    }
  }
  console.log('');

  console.log('═══════════════════════════════════════════════════');
  console.log('📋 INSPECTION COMPLETE');
  console.log('═══════════════════════════════════════════════════\n');
});
