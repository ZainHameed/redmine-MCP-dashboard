import { environment } from '../../../environments/environment';

export const REDMINE_CONFIG = {
  BASE_URL: environment.redmineHost,
  ISSUES_URL: `${environment.redmineHost}/issues`,
  PROJECTS_URL: `${environment.redmineHost}/projects`
} as const;

export const getIssueUrl = (issueId: number): string => {
  return `${REDMINE_CONFIG.ISSUES_URL}/${issueId}`;
};

export const getProjectUrl = (projectIdentifier: string): string => {
  return `${REDMINE_CONFIG.PROJECTS_URL}/${projectIdentifier}`;
};
