/**
 * Redmine MCP Dashboard - Project Constants
 * 
 * This file contains the whitelisted projects that are enabled for 
 * productivity features. Only these projects will be
 * included in productivity calculations and user filtering.
 */

// Configure which projects to enable for productivity features
export const WHITELISTED_PROJECTS = [
  {
    id: 18,
    name: 'Rolustech',
    key: 'ROLUSTECH',
    description: 'Main Rolustech project'
  },
  {
    id: 944,
    name: 'Panavid Fixed Cost Projects',
    key: 'PANAVID',
    description: 'Panavid Fixed Cost Projects'
  }
] as const;

// Helper functions for dynamic usage
export const getWhitelistedProjectIds = (): number[] => {
  return WHITELISTED_PROJECTS.map(p => p.id);
};

export const getWhitelistedProjectNames = (): string[] => {
  return WHITELISTED_PROJECTS.map(p => p.name);
};

export const getWhitelistedProjectByKey = (key: string) => {
  return WHITELISTED_PROJECTS.find(p => p.key === key);
};

export const getWhitelistedProjectById = (id: number) => {
  return WHITELISTED_PROJECTS.find(p => p.id === id);
};

// Usage in components - no API call needed
export const isWhitelistedProject = (projectId: number): boolean => {
  return getWhitelistedProjectIds().includes(projectId);
};

// Type definitions for better TypeScript support
export interface WhitelistedProject {
  id: number;
  name: string;
  key: string;
  description: string;
}

export type WhitelistedProjectId = typeof WHITELISTED_PROJECTS[number]['id'];
export type WhitelistedProjectKey = typeof WHITELISTED_PROJECTS[number]['key'];
