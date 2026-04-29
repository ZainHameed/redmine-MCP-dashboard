/**
 * Application Constants
 * Centralized location for app-level constants
 */

module.exports = {
  // API Limits
  TIME_ENTRIES_LIMIT: 100,
  MEMBERSHIPS_LIMIT: 200,
  DEFAULT_MEMBERSHIPS_LIMIT: 25,
  
  // Status Names
  STATUS_CLOSED: 'Closed',
  DEFAULT_STATUS_NAME: 'New',
  
  // Special Keywords
  KEYWORD_TBD: 'tbd',
  KEYWORD_PROJECT_MANAGEMENT: 'project management',
  KEYWORD_DEPLOYMENT: 'deployment',
  
  // Bulk Ticket Creator
  DEFAULT_PROJECT_ID: null, // Will be set to AI TRAINING project ID after fetching
  AI_TRAINING_PROJECT_ID: 1586, // AI Training project ID
  PANAVID_PROJECT_ID: 944, // Panavid Fixed Cost Projects ID
  TRACKER_NAMES: {
    STORY: ['Story', 'User Story', 'Epic'],
    TASK: ['Task', 'Feature'],
    SUBTASK: ['Subtask', 'Sub-task', 'Sub Task']
  }
};

