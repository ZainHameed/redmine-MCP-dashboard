/**
 * Cleanup script to delete test tickets created during testing
 * Usage: node backend/scripts/cleanup-test-tickets.js
 */

require('dotenv').config();
const axios = require('axios');

const REDMINE_HOST = process.env.REDMINE_HOST || 'https://redmine.rolustech.com/projects.json';
const REDMINE_API_KEY = process.env.REDMINE_API_KEY;

// Test ticket IDs to delete (from the execution results)
const TEST_TICKET_IDS = [
  162774, 162775, 162776, 162777, 162778, 162779, 162780, 162781, 162782, 162783,
  162784, 162785, 162786, 162787, 162788, 162789, 162790, 162791, 162792, 162793,
  162794, 162795, 162796, 162797, 162798, 162799, 162800, 162801, 162802, 162803,
  162804, 162805, 162806, 162807, 162808, 162809, 162810, 162811, 162812, 162813,
  162814, 162815, 162816, 162817, 162818, 162819, 162820, 162821, 162822, 162823,
  162824, 162825, 162826, 162827, 162828, 162829, 162830, 162831, 162832, 162833,
  162834, 162835, 162836, 162837
];

const baseUrl = REDMINE_HOST.replace('/projects.json', '');

async function deleteIssue(issueId) {
  try {
    const url = `${baseUrl}/issues/${issueId}.json`;
    await axios.delete(url, {
      headers: { 'X-Redmine-API-Key': REDMINE_API_KEY }
    });
    return { id: issueId, success: true };
  } catch (error) {
    return { id: issueId, success: false, error: error.message };
  }
}

async function cleanup() {
  console.log(`Starting cleanup of ${TEST_TICKET_IDS.length} test tickets...`);
  
  const results = [];
  for (const ticketId of TEST_TICKET_IDS) {
    const result = await deleteIssue(ticketId);
    results.push(result);
    if (result.success) {
      console.log(`✓ Deleted ticket #${ticketId}`);
    } else {
      console.log(`✗ Failed to delete ticket #${ticketId}: ${result.error}`);
    }
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
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
      console.log(`  - #${r.id}: ${r.error}`);
    });
  }
}

cleanup().catch(error => {
  console.error('Cleanup failed:', error);
  process.exit(1);
});
