/**
 * Redmine MCP Dashboard - Project Configuration
 * 
 * This file contains the whitelisted projects that are enabled for 
 * productivity and time log features. Only these projects will be
 * included in productivity calculations and user filtering.
 */

// Configure which projects to enable for productivity and time log features
const WHITELISTED_PROJECTS = [
  {
    id: 944,
    name: 'Panavid Fixed Cost Projects',
    key: 'PANAVID',
    description: 'Panavid Fixed Cost Projects'
  }
];

// Helper functions for dynamic usage
const getWhitelistedProjectIds = () => {
  return WHITELISTED_PROJECTS.map(p => p.id);
};

const getWhitelistedProjectNames = () => {
  return WHITELISTED_PROJECTS.map(p => p.name);
};

const getWhitelistedProjectByKey = (key) => {
  return WHITELISTED_PROJECTS.find(p => p.key === key);
};

const getWhitelistedProjectById = (id) => {
  return WHITELISTED_PROJECTS.find(p => p.id === id);
};

const isWhitelistedProject = (projectId) => {
  return getWhitelistedProjectIds().includes(projectId);
};

// Export for use across backend
module.exports = { 
  WHITELISTED_PROJECTS,
  getWhitelistedProjectIds,
  getWhitelistedProjectNames,
  getWhitelistedProjectByKey,
  getWhitelistedProjectById,
  isWhitelistedProject
};
