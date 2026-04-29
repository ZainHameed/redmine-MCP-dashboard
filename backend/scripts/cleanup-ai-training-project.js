/**
 * Cleanup script to delete all tickets in AI Training project
 * Usage: node backend/scripts/cleanup-ai-training-project.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const axios = require('axios');

const REDMINE_HOST = process.env.REDMINE_HOST || 'https://redmine.rolustech.com/projects.json';
const REDMINE_API_KEY = process.env.REDMINE_API_KEY;
const PROJECT_ID = 1586; // AI Training project ID
const EXCLUDE_ISSUE_IDS = [162767]; // User story that should not be deleted

const baseUrl = REDMINE_HOST.replace('/projects.json', '');

async function getAllIssues(projectId) {
  const issues = [];
  let offset = 0;
  const limit = 100;

  console.log(`Fetching all issues from project ${projectId}...`);

  while (true) {
    try {
      const url = `${baseUrl}/issues.json?project_id=${projectId}&limit=${limit}&offset=${offset}&status_id=*`;
      const response = await axios.get(url, {
        headers: { 'X-Redmine-API-Key': REDMINE_API_KEY }
      });

      const batch = response.data.issues || [];
      if (batch.length === 0) break;

      issues.push(...batch);
      console.log(`  Fetched ${issues.length} issues so far...`);

      if (batch.length < limit) break;
      offset += limit;
    } catch (error) {
      console.error(`Error fetching issues: ${error.message}`);
      break;
    }
  }

  return issues;
}

async function deleteIssue(issueId) {
  try {
    const url = `${baseUrl}/issues/${issueId}.json`;
    await axios.delete(url, {
      headers: { 'X-Redmine-API-Key': REDMINE_API_KEY }
    });
    return { id: issueId, success: true };
  } catch (error) {
    return { 
      id: issueId, 
      success: false, 
      error: error.response?.status === 401 ? 'Unauthorized (401)' : error.message 
    };
  }
}

async function cleanup() {
  if (!REDMINE_API_KEY) {
    console.error('❌ REDMINE_API_KEY is not set in .env file');
    process.exit(1);
  }

  console.log(`Starting cleanup of all tickets in project ${PROJECT_ID} (AI Training)...`);
  console.log(`Excluding issue IDs: ${EXCLUDE_ISSUE_IDS.join(', ')}\n`);

  // Get all issues
  const issues = await getAllIssues(PROJECT_ID);
  
  // Filter out excluded issues
  const issuesToDelete = issues
    .filter(issue => !EXCLUDE_ISSUE_IDS.includes(issue.id))
    .map(issue => ({
      id: issue.id,
      subject: issue.subject,
      tracker: issue.tracker?.name || 'Unknown'
    }));

  if (issuesToDelete.length === 0) {
    console.log('No tickets to delete (excluding user stories).');
    return;
  }

  console.log(`\nFound ${issuesToDelete.length} tickets to delete:`);
  issuesToDelete.forEach(issue => {
    console.log(`  - #${issue.id}: ${issue.subject} (${issue.tracker})`);
  });

  console.log(`\n⚠️  WARNING: This will delete ${issuesToDelete.length} tickets!`);
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('\nStarting deletion...\n');

  const results = [];
  for (const issue of issuesToDelete) {
    const result = await deleteIssue(issue.id);
    results.push(result);
    if (result.success) {
      console.log(`✓ Deleted ticket #${issue.id}: ${issue.subject}`);
    } else {
      console.log(`✗ Failed to delete ticket #${issue.id}: ${result.error}`);
    }
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('\n=== Cleanup Summary ===');
  console.log(`Total: ${results.length}`);
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed tickets:');
    results.filter(r => !r.success).forEach(r => {
      const issue = issuesToDelete.find(i => i.id === r.id);
      console.log(`  - #${r.id} (${issue?.subject || 'Unknown'}): ${r.error}`);
    });
  }

  if (succeeded > 0) {
    console.log(`\n✅ Successfully deleted ${succeeded} tickets from AI Training project.`);
  }
}

cleanup().catch(error => {
  console.error('Cleanup failed:', error);
  process.exit(1);
});
