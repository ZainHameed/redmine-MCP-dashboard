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
  const url = `${REDMINE_HOST.replace('/projects.json', '')}/issues/${issueId}.json`;
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

module.exports = {
  getProjects,
  getProjectByName,
  getIssueById,
  getTimeEntriesForIssue,
  getTimeEntriesForUser,
  getTimeEntriesForExport,
  getOpenIssues,
  getProjectMembers,
  getUserById
};

