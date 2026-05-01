/**
 * Redmine Service
 * Handles all interactions with the Redmine API
 */

const axios = require('axios');
const { REDMINE_HOST, REDMINE_API_KEY } = require('../config/environment');
const { TIME_ENTRIES_LIMIT } = require('../config/constants');

/**
 * Get all projects from Redmine
 */
const getProjects = async () => {
  const response = await axios.get(REDMINE_HOST, {
    headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
  });
  return response.data.projects || [];
};

/**
 * Get project by name
 */
const getProjectByName = async (name) => {
  try {
    const projects = await getProjects();
    const project = projects.find(p => p.name === name);
    return project ? project.id : null;
  } catch {
    return null;
  }
};

/**
 * Get issue details by ID
 */
const getIssueById = async (issueId) => {
  const url = `${REDMINE_HOST.replace('/projects.json', '')}/issues/${issueId}.json?include=journals`;
  const response = await axios.get(url, {
    headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
  });
  return response.data.issue;
};

/**
 * Get all time entries for an issue
 */
const getTimeEntriesForIssue = async (issueId) => {
  const url = `${REDMINE_HOST.replace('/projects.json', '')}/time_entries.json?issue_id=${issueId}&limit=${TIME_ENTRIES_LIMIT}`;
  const response = await axios.get(url, {
    headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
  });
  return response.data.time_entries || [];
};

/**
 * Get time entries for a user in a project within a date range
 */
const getTimeEntriesForUser = async (userId, projectId, fromDate, toDate) => {
  let url = `${REDMINE_HOST.replace('/projects.json', '')}/time_entries.json?user_id=${userId}&project_id=${projectId}&limit=${TIME_ENTRIES_LIMIT}`;
  
  if (fromDate && toDate) {
    url += `&from=${fromDate}&to=${toDate}`;
  }
  
  const response = await axios.get(url, {
    headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
  });
  return response.data.time_entries || [];
};

/**
 * Get time entries for CSV export (supports date range filter)
 */
const getTimeEntriesForExport = async (userId, projectIds, fromDate, toDate) => {
  let url = `${REDMINE_HOST.replace('/projects.json', '')}/time_entries.json?user_id=${userId}&limit=${TIME_ENTRIES_LIMIT}`;
  
  if (fromDate && toDate) {
    url += `&spent_on=><${fromDate}|${toDate}`;
  }
  
  if (projectIds && projectIds.length > 0) {
    url += `&project_id=${projectIds.join(',')}`;
  }
  
  const response = await axios.get(url, {
    headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
  });
  return response.data.time_entries || [];
};

/**
 * Get open issues for a user/project
 */
const getOpenIssues = async (projectId, userId) => {
  let url = `${REDMINE_HOST.replace('/projects.json', '')}/issues.json?status_id=open`;
  
  if (projectId) {
    url += `&project_id=${projectId}`;
  }
  
  if (userId) {
    url += `&assigned_to_id=${userId}`;
  } else {
    url += `&assigned_to_id=me`;
  }
  
  const response = await axios.get(url, {
    headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
  });
  return response.data.issues || [];
};

/**
 * Get project members with pagination support
 */
const getProjectMembers = async (projectId) => {
  const members = [];
  const membersUrl = `${REDMINE_HOST.replace('/projects.json', '')}/projects/${projectId}/memberships.json?limit=200`;
  
  try {
    const response = await axios.get(membersUrl, {
      headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
    });
    
    const firstBatch = response.data.memberships || [];
    members.push(...firstBatch);
    
    // Handle pagination if needed
    const totalCount = response.data.total_count;
    const limit = response.data.limit || 25;
    const offset = response.data.offset || 0;
    
    if (totalCount > limit) {
      const remainingPages = Math.ceil((totalCount - limit) / limit);
      for (let page = 1; page <= remainingPages; page++) {
        try {
          const nextOffset = offset + (page * limit);
          const nextUrl = `${REDMINE_HOST.replace('/projects.json', '')}/projects/${projectId}/memberships.json?limit=${limit}&offset=${nextOffset}`;
          const nextResponse = await axios.get(nextUrl, {
            headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
          });
          
          const nextBatch = nextResponse.data.memberships || [];
          members.push(...nextBatch);
        } catch (pageError) {
          console.warn(`Failed to get page ${page} members for project ${projectId}:`, pageError.message);
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to get members for project ${projectId}:`, error.message);
  }
  
  return members;
};

/**
 * Get user details by ID
 */
const getUserById = async (userId) => {
  const url = `${REDMINE_HOST.replace('/projects.json', '')}/users/${userId}.json`;
  const response = await axios.get(url, {
    headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
  });
  return response.data.user;
};

/**
 * Get all users from Redmine (for dropdown population)
 * @returns {Promise<Array<{id: number, name: string}>>}
 */
const getAllUsers = async () => {
  const users = [];
  const baseUrl = REDMINE_HOST.replace('/projects.json', '');
  let offset = 0;
  const limit = 100;
  
  try {
    while (true) {
      const url = `${baseUrl}/users.json?limit=${limit}&offset=${offset}`;
      const response = await axios.get(url, {
        headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
      });
      
      const batch = response.data.users || [];
      if (batch.length === 0) break;
      
      users.push(...batch.map(user => ({
        id: user.id,
        name: user.firstname && user.lastname 
          ? `${user.firstname} ${user.lastname}`.trim()
          : user.login || `User ${user.id}`
      })));
      
      if (batch.length < limit) break;
      offset += limit;
    }
  } catch (error) {
    console.warn('Failed to get all users:', error.message);
  }
  
  return users;
};

/**
 * Get all trackers from Redmine
 * @returns {Promise<Array<{id: number, name: string}>>}
 */
const getTrackers = async () => {
  try {
    const url = `${REDMINE_HOST.replace('/projects.json', '')}/trackers.json`;
    const response = await axios.get(url, {
      headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
    });
    return response.data.trackers || [];
  } catch (error) {
    console.warn('Failed to get trackers:', error.message);
    return [];
  }
};

/**
 * Get all issue statuses from Redmine
 * @returns {Promise<Array<{id: number, name: string}>>}
 */
const getStatuses = async () => {
  try {
    const url = `${REDMINE_HOST.replace('/projects.json', '')}/issue_statuses.json`;
    const response = await axios.get(url, {
      headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
    });
    return response.data.issue_statuses || [];
  } catch (error) {
    console.warn('Failed to get statuses:', error.message);
    return [];
  }
};

/**
 * Create an issue in Redmine
 * @param {Object} issueData - Issue data
 * @param {string} issueData.subject - Issue subject
 * @param {number} issueData.project_id - Project ID
 * @param {number} [issueData.tracker_id] - Tracker ID
 * @param {number} [issueData.status_id] - Status ID
 * @param {number} [issueData.assigned_to_id] - Assignee user ID
 * @param {number} [issueData.estimated_hours] - Estimated hours
 * @param {string} [issueData.description] - Description
 * @param {number} [issueData.parent_issue_id] - Parent issue ID
 * @returns {Promise<Object>} Created issue
 */
const createIssue = async (issueData) => {
  const url = `${REDMINE_HOST.replace('/projects.json', '')}/issues.json`;
  const response = await axios.post(url, {
    issue: issueData
  }, {
    headers: {
      'X-Redmine-API-Key': REDMINE_API_KEY,
      'Content-Type': 'application/json'
    }
  });
  return response.data.issue;
};

/**
 * Delete an issue from Redmine
 * @param {number} issueId - Issue ID to delete
 * @returns {Promise<void>}
 */
const deleteIssue = async (issueId) => {
  const url = `${REDMINE_HOST.replace('/projects.json', '')}/issues/${issueId}.json`;
  await axios.delete(url, {
    headers: { 'X-Redmine-API-Key': REDMINE_API_KEY }
  });
};

/**
 * Get versions (target versions / milestones) for a project
 * @param {number} projectId - Project ID
 * @returns {Promise<Array<{id: number, name: string, status: string}>>}
 */
const getProjectVersions = async (projectId) => {
  const baseUrl = REDMINE_HOST.replace('/projects.json', '');
  const versions = [];
  let offset = 0;
  const limit = 100;

  try {
    while (true) {
      const url = `${baseUrl}/projects/${projectId}/versions.json?limit=${limit}&offset=${offset}`;
      const response = await axios.get(url, {
        headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
      });
      const batch = response.data.versions || [];
      if (batch.length === 0) break;
      versions.push(
        ...batch.map((v) => ({
          id: v.id,
          name: v.name,
          status: v.status,
        }))
      );
      if (batch.length < limit) break;
      offset += limit;
    }
  } catch (error) {
    console.warn(`Failed to get versions for project ${projectId}:`, error.message);
  }

  return versions;
};

/**
 * Get user stories (issues with Story tracker) for a project
 * @param {number} projectId - Project ID
 * @returns {Promise<Array<{id: number, subject: string}>>}
 */
const getUserStories = async (projectId) => {
  try {
    const baseUrl = REDMINE_HOST.replace('/projects.json', '');
    const stories = [];
    let offset = 0;
    const limit = 100;
    
    // Get trackers first to find Story tracker ID
    const trackers = await getTrackers();
    const storyTracker = trackers.find(t => 
      ['Story', 'User Story', 'Epic'].some(name => 
        t.name.toLowerCase().includes(name.toLowerCase())
      )
    );
    
    if (!storyTracker) {
      console.warn('No Story tracker found');
      return [];
    }
    
    while (true) {
      const url = `${baseUrl}/issues.json?project_id=${projectId}&tracker_id=${storyTracker.id}&status_id=*&limit=${limit}&offset=${offset}`;
      const response = await axios.get(url, {
        headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
      });
      
      const batch = response.data.issues || [];
      if (batch.length === 0) break;
      
      stories.push(...batch.map(issue => ({
        id: issue.id,
        subject: issue.subject,
        tracker_id: issue.tracker.id
      })));
      
      if (batch.length < limit) break;
      offset += limit;
    }
    
    return stories;
  } catch (error) {
    console.warn('Failed to get user stories:', error.message);
    return [];
  }
};

module.exports = {
  getProjects,
  getProjectByName,
  getIssueById,
  getTimeEntriesForIssue,
  getTimeEntriesForUser,
  getTimeEntriesForExport,
  getOpenIssues,
  getProjectMembers,
  getUserById,
  getAllUsers,
  getTrackers,
  getStatuses,
  createIssue,
  deleteIssue,
  getProjectVersions,
  getUserStories
};

