/**
 * Productivity Service
 * Handles productivity calculations and time tracking logic
 */

const { getTimeEntriesForIssue } = require('./redmine.service');
const { STATUS_CLOSED, KEYWORD_TBD, KEYWORD_PROJECT_MANAGEMENT, KEYWORD_DEPLOYMENT } = require('../config/constants');

/**
 * Calculate productivity, calculated time, and remaining time for a user on an issue
 * @param {Object} issue - The Redmine issue object
 * @param {number} userTimeSpent - Time spent by user in the current period
 * @param {number|string} user_id - User ID
 * @param {Array} userTimeEntriesForIssue - User's time entries for this issue
 * @param {string} fromDate - Start date of period (optional)
 * @param {string} toDate - End date of period (optional)
 * @returns {Object} { calculated_time, productivity, remaining_time }
 */
async function calculateProductivity(issue, userTimeSpent, user_id, userTimeEntriesForIssue, fromDate, toDate) {
  const estimatedHours = issue.estimated_hours || 0;
  const subject = issue.subject || '';
  const status = issue.status?.name || '';
  const hasTBD = subject.toLowerCase().includes(KEYWORD_TBD);
  const isPMOrDeployment = subject.toLowerCase().includes(KEYWORD_PROJECT_MANAGEMENT) || subject.toLowerCase().includes(KEYWORD_DEPLOYMENT);
  
  let calculated_time = 0;
  let productivity = null;
  let remaining_time = null;
  
  // Rule 6.1: If estimated time is N/A then calculated_time = 0 and productivity = 0%
  if (!estimatedHours) {
    // Special case: TBD with N/A estimated time = n/n = 100%
    if (hasTBD) {
      calculated_time = userTimeSpent; // n/n calculation
      productivity = 100;
    } else {
      calculated_time = 0;
      productivity = userTimeSpent > 0 ? 0 : null;
    }
    return { calculated_time, productivity, remaining_time };
  }
  
  // Fetch ALL time entries for this issue to calculate total time spent by all users
  let allTimeEntriesForIssue = [];
  try {
    allTimeEntriesForIssue = await getTimeEntriesForIssue(issue.id);
  } catch (error) {
    console.warn(`Failed to get all time entries for issue ${issue.id}:`, error.message);
  }
  
  const totalTimeSpentByAllUsers = allTimeEntriesForIssue.reduce((sum, entry) => sum + (entry.hours || 0), 0);
  const uniqueUsers = [...new Set(allTimeEntriesForIssue.map(entry => entry.user?.id))].filter(Boolean);
  const multipleUsersLogged = uniqueUsers.length > 1;
  
  // Rule 6.2 & 6.3: For closed tickets with multiple users
  if (status === STATUS_CLOSED && multipleUsersLogged) {
    // Calculated time for this user is their logged time (n/n = 100%)
    calculated_time = userTimeSpent;
    productivity = userTimeSpent > 0 ? 100 : null;
    
    // Rule 6.3: Calculate remaining time for PM/Deployment tickets
    if (isPMOrDeployment && estimatedHours > totalTimeSpentByAllUsers) {
      remaining_time = estimatedHours - totalTimeSpentByAllUsers;
    }
    
    return { calculated_time, productivity, remaining_time };
  }
  
  // Get all time entries for this user on this issue (not filtered by date range)
  const allUserTimeEntries = allTimeEntriesForIssue.filter(entry => entry.user?.id == user_id);
  const totalUserTimeAllTime = allUserTimeEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
  
  // Sort ALL time entries chronologically to track cumulative time
  const sortedTimeEntries = [...allTimeEntriesForIssue].sort((a, b) => {
    const dateA = new Date(a.spent_on);
    const dateB = new Date(b.spent_on);
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA - dateB;
    }
    // If same date, use ID as tiebreaker for consistent ordering
    const idA = parseInt(a.id) || 0;
    const idB = parseInt(b.id) || 0;
    return idA - idB;
  });
  
  // Calculate total time logged BEFORE each user entry in the date range
  let cumulativeTimeSpent = 0;
  let remainingEstimated = estimatedHours;
  
  // Process entries chronologically to find when user logged time
  for (const entry of sortedTimeEntries) {
    const entryUserId = entry.user?.id;
    const isUserEntry = entryUserId == user_id; // Use == for type coercion
    const entryDate = entry.spent_on;
    const isInDateRange = !fromDate || new Date(entryDate) >= new Date(fromDate);
    
    // Check BEFORE adding current entry to cumulative
    if (isUserEntry && isInDateRange) {
      // This is the user's entry in the current date range
      // Check how much estimated time was available when they logged
      if (cumulativeTimeSpent >= estimatedHours) {
        // All estimated time already consumed by previous entries
        remainingEstimated = 0;
      } else {
        remainingEstimated = estimatedHours - cumulativeTimeSpent;
      }
      // Once we find the first user entry in date range, we have the answer
      break;
    }
    
    // Add this entry's time to cumulative (count all entries before the user's entry)
    cumulativeTimeSpent += entry.hours || 0;
  }
  
  // If user's entries weren't found in the loop, calculate remaining based on total before date range
  if (fromDate && remainingEstimated === estimatedHours) {
    const fromDateObj = new Date(fromDate);
    const totalBeforeDateRange = sortedTimeEntries
      .filter(entry => new Date(entry.spent_on) < fromDateObj)
      .reduce((sum, entry) => sum + (entry.hours || 0), 0);
    remainingEstimated = Math.max(0, estimatedHours - totalBeforeDateRange);
  }
  
  // For Closed status with multiple users - use n/n calculation
  if (status === STATUS_CLOSED && multipleUsersLogged) {
    calculated_time = userTimeSpent;
    productivity = userTimeSpent > 0 ? 100 : null;
    
    // Calculate remaining time for ALL closed tickets
    if (estimatedHours > totalTimeSpentByAllUsers) {
      remaining_time = estimatedHours - totalTimeSpentByAllUsers;
    }
    
    return { calculated_time, productivity, remaining_time };
  }
  
  // For ALL other statuses - use cumulative tracking
  // This includes: New, In Progress, Closed (single user), Move to PreProd, Move to Staging, Resolved, etc.
  if (userTimeSpent === 0) {
    return { calculated_time: 0, productivity: null, remaining_time };
  }
  
  // If all estimated time was already consumed by other users, productivity is 0%
  if (remainingEstimated <= 0) {
    return { calculated_time: 0, productivity: 0, remaining_time };
  }
  
  // Calculated time is min of (remaining estimated, time spent in current period)
  calculated_time = Math.min(remainingEstimated, userTimeSpent);
  productivity = Math.round((calculated_time / userTimeSpent) * 100);
  
  // Calculate remaining time for ALL closed tickets
  if (status === STATUS_CLOSED && estimatedHours > totalTimeSpentByAllUsers) {
    remaining_time = estimatedHours - totalTimeSpentByAllUsers;
  }
  
  return { calculated_time, productivity, remaining_time };
}

module.exports = {
  calculateProductivity
};

