import { test } from '@playwright/test';

/**
 * Check the actual workflow logs to see what's failing
 */
test('check workflow logs for actual error', async ({ page }) => {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔍 CHECKING WORKFLOW LOGS');
  console.log('═══════════════════════════════════════════════════\n');
  
  // Get the latest workflow run
  const runsUrl = 'https://api.github.com/repos/swipswaps/DockerOCR/actions/runs?per_page=1';
  
  const runsResponse = await page.request.get(runsUrl);
  const runsData = await runsResponse.json();
  
  if (runsData.workflow_runs && runsData.workflow_runs.length > 0) {
    const latestRun = runsData.workflow_runs[0];
    
    console.log('📊 LATEST WORKFLOW RUN:');
    console.log('─────────────────────────────────────────────────');
    console.log(`Name: ${latestRun.name}`);
    console.log(`Status: ${latestRun.status}`);
    console.log(`Conclusion: ${latestRun.conclusion}`);
    console.log(`Created: ${latestRun.created_at}`);
    console.log(`URL: ${latestRun.html_url}`);
    console.log('');
    
    // Get jobs for this run
    const jobsUrl = latestRun.jobs_url;
    const jobsResponse = await page.request.get(jobsUrl);
    const jobsData = await jobsResponse.json();
    
    console.log('📋 JOBS:');
    console.log('─────────────────────────────────────────────────');
    
    for (const job of jobsData.jobs) {
      console.log(`\n${job.conclusion === 'success' ? '✅' : '❌'} ${job.name}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   Conclusion: ${job.conclusion}`);
      console.log(`   Started: ${job.started_at}`);
      console.log(`   Completed: ${job.completed_at}`);
      
      console.log('\n   STEPS:');
      for (const step of job.steps) {
        const icon = step.conclusion === 'success' ? '✅' : 
                     step.conclusion === 'failure' ? '❌' : 
                     step.conclusion === 'skipped' ? '⏭️' : '⏳';
        console.log(`   ${icon} ${step.name} (${step.conclusion})`);
      }
      
      // Find the failed step
      const failedStep = job.steps.find((s: any) => s.conclusion === 'failure');
      if (failedStep) {
        console.log(`\n   ❌ FAILED STEP: ${failedStep.name}`);
        console.log(`      Number: ${failedStep.number}`);
      }
    }
    
    console.log('\n');
    console.log('🔍 FETCHING DETAILED LOGS:');
    console.log('─────────────────────────────────────────────────');
    
    // Get logs URL
    const logsUrl = latestRun.logs_url;
    console.log(`Logs URL: ${logsUrl}`);
    
    // Try to fetch logs (may require auth)
    const logsResponse = await page.request.get(logsUrl);
    console.log(`Logs HTTP Status: ${logsResponse.status()}`);
    
    if (logsResponse.status() === 200) {
      console.log('✅ Logs fetched successfully (would need to extract from zip)');
    } else {
      console.log('❌ Cannot fetch logs (requires authentication)');
    }
    
  } else {
    console.log('❌ No workflow runs found');
  }
  
  console.log('\n');
  console.log('═══════════════════════════════════════════════════');
  console.log('📋 ANALYSIS COMPLETE');
  console.log('═══════════════════════════════════════════════════\n');
  
  // Now check if there's a Pages environment
  console.log('🔍 CHECKING GITHUB PAGES ENVIRONMENT:');
  console.log('─────────────────────────────────────────────────');
  
  const envsUrl = 'https://api.github.com/repos/swipswaps/DockerOCR/environments';
  const envsResponse = await page.request.get(envsUrl);
  
  if (envsResponse.status() === 200) {
    const envsData = await envsResponse.json();
    console.log(`Found ${envsData.total_count} environment(s):`);
    
    for (const env of envsData.environments || []) {
      console.log(`\n  📦 ${env.name}`);
      console.log(`     ID: ${env.id}`);
      console.log(`     URL: ${env.html_url}`);
    }
  } else {
    console.log(`❌ Cannot fetch environments (HTTP ${envsResponse.status()})`);
  }
  
  console.log('\n');
});

