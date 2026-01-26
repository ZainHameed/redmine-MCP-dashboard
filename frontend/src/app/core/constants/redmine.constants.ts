import { environment } from '../../../environments/environment';

export const REDMINE_CONFIG = {
  BASE_URL: environment.redmineHost,
  ISSUES_URL: `${environment.redmineHost}/issues`,
  PROJECTS_URL: `${environment.redmineHost}/projects`
} as const;

export const getIssueUrl = (issueId: number): string => {
  return `${REDMINE_CONFIG.ISSUES_URL}/${issueId}`;
};

export const getTimeEntriesUrl = (issueId: number, userId?: number, fromDate?: string, toDate?: string): string => {
  let url = `${REDMINE_CONFIG.BASE_URL}/time_entries?utf8=%E2%9C%93&set_filter=1&sort=spent_on%3Adesc`;
  
  // Add spent_on date filter
  if (fromDate && toDate) {
    url += `&f%5B%5D=spent_on&op%5Bspent_on%5D=><&v%5Bspent_on%5D%5B%5D=${fromDate}&v%5Bspent_on%5D%5B%5D=${toDate}`;
  }
  
  // Add issue_id filter
  url += `&f%5B%5D=issue_id&op%5Bissue_id%5D=%3D&v%5Bissue_id%5D%5B%5D=${issueId}`;
  
  // Add user_id filter if provided
  if (userId) {
    url += `&f%5B%5D=user_id&op%5Buser_id%5D=%3D&v%5Buser_id%5D%5B%5D=${userId}`;
  }
  
  // Add columns to display
  url += `&f%5B%5D=&c%5B%5D=project&c%5B%5D=spent_on&c%5B%5D=user&c%5B%5D=activity&c%5B%5D=issue&c%5B%5D=comments&c%5B%5D=hours&group_by=&t%5B%5D=hours&t%5B%5D=`;
  
  return url;
};

export const getProjectUrl = (projectIdentifier: string): string => {
  return `${REDMINE_CONFIG.PROJECTS_URL}/${projectIdentifier}`;
};
