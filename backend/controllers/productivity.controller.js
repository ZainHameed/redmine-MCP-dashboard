/**
 * Productivity Controller
 * Handles productivity-related request logic
 */

const redmineService = require('../services/redmine.service');
const productivityService = require('../services/productivity.service');
const csvHelper = require('../helpers/csv.helper');
const { getWhitelistedProjectIds, WHITELISTED_PROJECTS } = require('../config/projects');
const { PANAVID_PROJECT_ID } = require('../config/constants');

const parseFixedVersionIds = (raw) => {
  if (raw === undefined || raw === null || String(raw).trim() === '') return [];
  const parts = String(raw).split(',');
  return parts.map((id) => parseInt(id.trim(), 10)).filter((id) => !isNaN(id));
};

/**
 * When fixedVersionIds is non-empty, Panavid issues must have fixed_version in that set.
 * Issues without a target version are excluded. Non-Panavid issues pass through.
 */
const passesPanavidTargetVersionFilter = (issue, fixedVersionIds) => {
  if (!fixedVersionIds.length) return true;
  const issueProjectId = issue.project?.id ?? issue.project_id;
  if (Number(issueProjectId) !== Number(PANAVID_PROJECT_ID)) return true;
  const fvId = issue.fixed_version?.id ?? issue.fixed_version_id;
  if (fvId == null || fvId === '') return false;
  return fixedVersionIds.includes(Number(fvId));
};

/**
 * Open target versions for a whitelisted project (used by productivity UI)
 */
const getOpenTargetVersions = async (req, res) => {
  try {
    const project_id = req.query.project_id;
    if (!project_id) {
      return res.status(400).json({ error: 'project_id is required' });
    }
    const pid = parseInt(project_id, 10);
    if (isNaN(pid) || !getWhitelistedProjectIds().includes(pid)) {
      return res.status(400).json({ error: 'Invalid or non-whitelisted project_id' });
    }
    if (pid !== PANAVID_PROJECT_ID) {
      return res.status(400).json({ error: 'Target versions list is only available for Panavid Fixed Cost Projects' });
    }

    const allVersions = await redmineService.getProjectVersions(pid);
    const openVersions = allVersions
      .filter((v) => String(v.status).toLowerCase() === 'open')
      .map(({ id, name }) => ({ id, name }));

    res.json(openVersions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get productivity data for a user across selected projects
 */
const getProductivity = async (req, res) => {
  try {
    const { user_id, project_ids, from_date, to_date, fixed_version_ids } = req.query;
    const fixedVersionIds = parseFixedVersionIds(fixed_version_ids);
    
    console.log('Productivity API called with:', { user_id, project_ids, from_date, to_date });
    
    if (!user_id || !project_ids) {
      return res.status(400).json({ error: 'user_id and project_ids are required' });
    }

    const projectIds = Array.isArray(project_ids) ? project_ids : project_ids.split(',').map(id => id.trim());
    console.log('Parsed project IDs:', projectIds);
    
    // Validate project IDs against whitelisted projects
    const validProjectIds = projectIds.filter(id => 
      getWhitelistedProjectIds().includes(parseInt(id))
    );
    console.log('Valid project IDs:', validProjectIds);
    
    if (validProjectIds.length === 0) {
      return res.status(400).json({ error: 'No valid project IDs provided' });
    }

    const productivityData = [];
    
    for (const projectId of validProjectIds) {
      try {
        // Get time entries for the user in this project within the date range
        const timeEntries = await redmineService.getTimeEntriesForUser(user_id, projectId, from_date, to_date);
        console.log(`Found ${timeEntries.length} time entries for user ${user_id} in project ${projectId}`);
        
        // Group time entries by issue_id to get unique issues
        const issuesWithTime = {};
        timeEntries.forEach(entry => {
          if (entry.issue && entry.issue.id) {
            const issueId = entry.issue.id;
            if (!issuesWithTime[issueId]) {
              issuesWithTime[issueId] = {
                issue: entry.issue,
                totalTimeSpent: 0,
                timeEntries: []
              };
            }
            issuesWithTime[issueId].totalTimeSpent += entry.hours || 0;
            issuesWithTime[issueId].timeEntries.push(entry);
          }
        });
        
        // Process each issue that has time logged
        for (const [issueId, issueData] of Object.entries(issuesWithTime)) {
          const issue = issueData.issue;
          const totalTimeSpent = issueData.totalTimeSpent;
          
          // Fetch full issue details since time entries only have basic info
          let fullIssue = issue;
          try {
            fullIssue = await redmineService.getIssueById(issueId);
          } catch (issueError) {
            console.warn(`Failed to get full details for issue ${issueId}:`, issueError.message);
            // Use the basic issue info from time entry
          }

          if (!passesPanavidTargetVersionFilter(fullIssue, fixedVersionIds)) {
            continue;
          }
          
          // Extract time logging dates from time entries with hours
          const timeLogDetails = issueData.timeEntries.map(entry => ({
            date: entry.spent_on,
            hours: entry.hours || 0
          })).sort((a, b) => new Date(a.date) - new Date(b.date));
          
          // Calculate productivity, calculated time, and remaining time
          const result = await productivityService.calculateProductivity(fullIssue, totalTimeSpent, user_id, issueData.timeEntries, from_date, to_date);
          
          const timeLogDates = timeLogDetails.map(detail => detail.date);
          const firstTimeLog = timeLogDates[0];
          const lastTimeLog = timeLogDates[timeLogDates.length - 1];
          
          productivityData.push({
            ticket: fullIssue.id,
            subject: fullIssue.subject,
            calculated_time: result.calculated_time,
            time_spent: totalTimeSpent,
            productivity: result.productivity,
            remaining_time: result.remaining_time,
            created_on: fullIssue.created_on,
            updated_on: fullIssue.updated_on,
            status: fullIssue.status?.name || 'Unknown',
            project_id: projectId,
            project_name: WHITELISTED_PROJECTS.find(p => p.id === parseInt(projectId))?.name || 'Unknown',
            time_log_dates: timeLogDates,
            time_log_details: timeLogDetails,
            first_time_log: firstTimeLog,
            last_time_log: lastTimeLog
          });
        }
      } catch (error) {
        console.warn(`Failed to get productivity data for project ${projectId}:`, error.message);
      }
    }
    
    res.json(productivityData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Export productivity data as CSV for multiple users
 */
const exportProductivity = async (req, res) => {
  try {
    const { user_ids, project_ids, from_date, to_date, fixed_version_ids } = req.query;
    const fixedVersionIds = parseFixedVersionIds(fixed_version_ids);
    
    if (!user_ids) {
      return res.status(400).json({ error: 'user_ids parameter is required (comma-separated)' });
    }
    
    const userIdArray = user_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    
    if (userIdArray.length === 0) {
      return res.status(400).json({ error: 'At least one valid user_id is required' });
    }
    
    const projectIdArray = project_ids ? project_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : [];
    
    const allUsersData = [];
    
    // Fetch data for each user
    for (const userId of userIdArray) {
      // Get user info
      let userName = `User ${userId}`;
      try {
        const user = await redmineService.getUserById(userId);
        userName = `${user.firstname} ${user.lastname}`;
      } catch (error) {
        console.warn(`Could not fetch user ${userId} details:`, error.message);
      }
      
      // Get productivity data for this user
      const timeEntries = await redmineService.getTimeEntriesForExport(userId, projectIdArray, from_date, to_date);
      
      // Group time entries by issue
      const issueGroups = {};
      timeEntries.forEach(entry => {
        const issueId = entry.issue?.id;
        if (!issueId) return;
        
        if (!issueGroups[issueId]) {
          issueGroups[issueId] = [];
        }
        issueGroups[issueId].push(entry);
      });
      
      const userTickets = [];
      
      // Process each issue
      for (const [issueId, entries] of Object.entries(issueGroups)) {
        try {
          const issue = await redmineService.getIssueById(issueId);
          if (!passesPanavidTargetVersionFilter(issue, fixedVersionIds)) {
            continue;
          }
          const userTimeSpent = entries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
          
          const timeLogDetails = entries.map(entry => ({
            date: entry.spent_on,
            hours: entry.hours,
          }));
          
          // Calculate productivity using the same logic
          const productivityData = await productivityService.calculateProductivity(
            issue,
            userTimeSpent,
            userId,
            entries,
            from_date,
            to_date
          );
          
          userTickets.push({
            ticket: issue.id,
            subject: issue.subject,
            calculated_time: productivityData.calculated_time,
            time_spent: userTimeSpent,
            productivity: productivityData.productivity,
            remaining_time: productivityData.remaining_time,
            status: issue.status?.name || '',
            project_name: issue.project?.name || '',
            time_log_details: timeLogDetails,
          });
        } catch (error) {
          console.warn(`Failed to get issue ${issueId}:`, error.message);
        }
      }
      
      // Calculate user totals
      const userTotalCalculatedTime = userTickets.reduce((sum, t) => sum + (t.calculated_time || 0), 0);
      const userTotalTimeSpent = userTickets.reduce((sum, t) => sum + (t.time_spent || 0), 0);
      const userAvgProductivity = userTotalTimeSpent > 0 ? (userTotalCalculatedTime / userTotalTimeSpent) * 100 : 0;
      
      allUsersData.push({
        userName,
        tickets: userTickets,
        totalCalculatedTime: userTotalCalculatedTime,
        totalTimeSpent: userTotalTimeSpent,
        avgProductivity: userAvgProductivity,
      });
    }
    
    // Generate CSV content
    const csvContent = csvHelper.generateProductivityCSV(allUsersData, from_date, to_date);
    const filename = csvHelper.generateCSVFilename(from_date, to_date);
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
    
  } catch (error) {
    console.error('Error generating CSV export:', error.message);
    res.status(500).json({ error: 'Failed to generate CSV export', details: error.message });
  }
};

module.exports = {
  getOpenTargetVersions,
  getProductivity,
  exportProductivity
};

