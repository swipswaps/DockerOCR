import { test } from '@playwright/test';

/**
 * Diagnose the actual GitHub Pages configuration
 */
test('diagnose GitHub Pages configuration', async ({ page }) => {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔍 DIAGNOSING GITHUB PAGES CONFIGURATION');
  console.log('═══════════════════════════════════════════════════\n');
  
  // Check the repository API
  const repoApiUrl = 'https://api.github.com/repos/swipswaps/DockerOCR/pages';
  
  console.log('📡 Checking GitHub Pages API...');
  console.log(`URL: ${repoApiUrl}\n`);
  
  const response = await page.request.get(repoApiUrl);
  const status = response.status();
  
  console.log(`HTTP Status: ${status}`);
  
  if (status === 200) {
    const data = await response.json();
    console.log('\n✅ GitHub Pages IS configured:');
    console.log('─────────────────────────────────────────────────');
    console.log(JSON.stringify(data, null, 2));
    console.log('─────────────────────────────────────────────────\n');
  } else if (status === 404) {
    console.log('\n❌ GitHub Pages is NOT configured (404)');
    console.log('─────────────────────────────────────────────────');
    const text = await response.text();
    console.log(text);
    console.log('─────────────────────────────────────────────────\n');
  } else {
    console.log(`\n⚠️ Unexpected status: ${status}`);
    const text = await response.text();
    console.log(text);
  }
  
  // Check the actual deployment
  console.log('\n📍 Checking actual deployment URL...');
  const deployUrl = 'https://swipswaps.github.io/DockerOCR/';
  
  const deployResponse = await page.request.get(deployUrl);
  console.log(`Deployment URL: ${deployUrl}`);
  console.log(`HTTP Status: ${deployResponse.status()}`);
  
  if (deployResponse.status() === 404) {
    console.log('❌ Site returns 404\n');
  } else if (deployResponse.status() === 200) {
    console.log('✅ Site is live!\n');
  }
  
  // Check GitHub Actions runs
  console.log('📊 Checking recent GitHub Actions runs...');
  const actionsUrl = 'https://api.github.com/repos/swipswaps/DockerOCR/actions/runs?per_page=3';
  
  const actionsResponse = await page.request.get(actionsUrl);
  if (actionsResponse.status() === 200) {
    const actionsData = await actionsResponse.json();
    console.log(`\nFound ${actionsData.total_count} workflow runs`);
    console.log('─────────────────────────────────────────────────');
    
    for (const run of actionsData.workflow_runs.slice(0, 3)) {
      console.log(`\n${run.status === 'completed' ? '✅' : '⏳'} ${run.name}`);
      console.log(`   Status: ${run.status}`);
      console.log(`   Conclusion: ${run.conclusion}`);
      console.log(`   Created: ${run.created_at}`);
      console.log(`   URL: ${run.html_url}`);
    }
    console.log('─────────────────────────────────────────────────\n');
  }
  
  // Compare with working deployment
  console.log('🔄 Comparing with working CSV-to-XLSX-Converter...');
  const workingApiUrl = 'https://api.github.com/repos/swipswaps/CSV-to-XLSX-Converter/pages';
  
  const workingResponse = await page.request.get(workingApiUrl);
  if (workingResponse.status() === 200) {
    const workingData = await workingResponse.json();
    console.log('\n✅ Working site configuration:');
    console.log('─────────────────────────────────────────────────');
    console.log(JSON.stringify(workingData, null, 2));
    console.log('─────────────────────────────────────────────────\n');
  }
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📋 DIAGNOSIS COMPLETE');
  console.log('═══════════════════════════════════════════════════\n');
});

