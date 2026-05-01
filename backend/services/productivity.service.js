/**
 * Productivity Service
 * Handles productivity calculations and time tracking logic
 */

const { getTimeEntriesForIssue } = require('./redmine.service');
const { STATUS_CLOSED, KEYWORD_TBD, KEYWORD_PROJECT_MANAGEMENT, KEYWORD_DEPLOYMENT } = require('../config/constants');

/**
 * Prorated carry-over: opening runway at period start = estimate minus all hours logged before fromDate.
 */
function computeProratedCarryOver(sortedTimeEntries, fromDate, estimatedHours) {
  if (!fromDate) {
    return {
      hours_logged_before_period: 0,
      carried_over: false,
      opening_estimate: null,
    };
  }
  const fromDateObj = new Date(fromDate);
  const hours_logged_before_period = sortedTimeEntries
    .filter((entry) => new Date(entry.spent_on) < fromDateObj)
    .reduce((sum, entry) => sum + (entry.hours || 0), 0);
  const carried_over = hours_logged_before_period > 0;
  const opening_estimate =
    estimatedHours > 0
      ? Math.max(0, estimatedHours - hours_logged_before_period)
      : null;
  return { hours_logged_before_period, carried_over, opening_estimate };
}

function sortEntriesChronologically(entries) {
  return [...entries].sort((a, b) => {
    const dateA = new Date(a.spent_on);
    const dateB = new Date(b.spent_on);
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA - dateB;
    }
    const idA = parseInt(a.id, 10) || 0;
    const idB = parseInt(b.id, 10) || 0;
    return idA - idB;
  });
}

/**
 * Calculate productivity, calculated time, and remaining time for a user on an issue
 * @param {Object} issue - The Redmine issue object
 * @param {number} userTimeSpent - Time spent by user in the current period
 * @param {number|string} user_id - User ID
 * @param {Array} userTimeEntriesForIssue - User's time entries for this issue
 * @param {string} fromDate - Start date of period (optional)
 * @param {string} toDate - End date of period (optional)
 * @returns {Object} { calculated_time, productivity, remaining_time, carried_over, opening_estimate, hours_logged_before_period }
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

  let allTimeEntriesForIssue = [];
  try {
    allTimeEntriesForIssue = await getTimeEntriesForIssue(issue.id);
  } catch (error) {
    console.warn(`Failed to get all time entries for issue ${issue.id}:`, error.message);
  }

  const sortedTimeEntries = sortEntriesChronologically(allTimeEntriesForIssue);
  const carryMetrics = computeProratedCarryOver(sortedTimeEntries, fromDate, estimatedHours);

  // Rule 6.1: If estimated time is N/A then calculated_time = 0 and productivity = 0%
  if (!estimatedHours) {
    if (hasTBD) {
      calculated_time = userTimeSpent;
      productivity = 100;
    } else {
      calculated_time = 0;
      productivity = userTimeSpent > 0 ? 0 : null;
    }
    return { calculated_time, productivity, remaining_time, ...carryMetrics };
  }

  const totalTimeSpentByAllUsers = allTimeEntriesForIssue.reduce((sum, entry) => sum + (entry.hours || 0), 0);
  const uniqueUsers = [...new Set(allTimeEntriesForIssue.map(entry => entry.user?.id))].filter(Boolean);
  const multipleUsersLogged = uniqueUsers.length > 1;

  // Rule 6.2 & 6.3: For closed tickets with multiple users
  if (status === STATUS_CLOSED && multipleUsersLogged) {
    calculated_time = userTimeSpent;
    productivity = userTimeSpent > 0 ? 100 : null;

    if (isPMOrDeployment && estimatedHours > totalTimeSpentByAllUsers) {
      remaining_time = estimatedHours - totalTimeSpentByAllUsers;
    }

    return { calculated_time, productivity, remaining_time, ...carryMetrics };
  }

  // Calculate total time logged BEFORE each user entry in the date range
  let cumulativeTimeSpent = 0;
  let remainingEstimated = estimatedHours;

  for (const entry of sortedTimeEntries) {
    const entryUserId = entry.user?.id;
    const isUserEntry = entryUserId == user_id;
    const entryDate = entry.spent_on;
    const isInDateRange = !fromDate || new Date(entryDate) >= new Date(fromDate);

    if (isUserEntry && isInDateRange) {
      if (cumulativeTimeSpent >= estimatedHours) {
        remainingEstimated = 0;
      } else {
        remainingEstimated = estimatedHours - cumulativeTimeSpent;
      }
      break;
    }

    cumulativeTimeSpent += entry.hours || 0;
  }

  if (fromDate && remainingEstimated === estimatedHours) {
    const fromDateObj = new Date(fromDate);
    const totalBeforeDateRange = sortedTimeEntries
      .filter(entry => new Date(entry.spent_on) < fromDateObj)
      .reduce((sum, entry) => sum + (entry.hours || 0), 0);
    remainingEstimated = Math.max(0, estimatedHours - totalBeforeDateRange);
  }

  // Align with prorated opening estimate at period start (same as carryMetrics.opening_estimate)
  if (carryMetrics.opening_estimate !== null && remainingEstimated === estimatedHours && fromDate) {
    remainingEstimated = carryMetrics.opening_estimate;
  }

  // Closed + multiple users: mirrors legacy path after cumulative calculation (early return above still handles primary case)
  if (status === STATUS_CLOSED && multipleUsersLogged) {
    calculated_time = userTimeSpent;
    productivity = userTimeSpent > 0 ? 100 : null;
    if (estimatedHours > totalTimeSpentByAllUsers) {
      remaining_time = estimatedHours - totalTimeSpentByAllUsers;
    }
    return { calculated_time, productivity, remaining_time, ...carryMetrics };
  }

  if (userTimeSpent === 0) {
    return { calculated_time: 0, productivity: null, remaining_time, ...carryMetrics };
  }

  if (remainingEstimated <= 0) {
    remaining_time = 0;
    return { calculated_time: 0, productivity: 0, remaining_time, ...carryMetrics };
  }

  calculated_time = Math.min(remainingEstimated, userTimeSpent);
  productivity = Math.round((calculated_time / userTimeSpent) * 100);

  // Dynamic period remaining for carried-over work: opening estimate minus this period's spent time.
  if (carryMetrics.opening_estimate !== null && carryMetrics.opening_estimate !== undefined) {
    remaining_time = Math.max(0, Number(carryMetrics.opening_estimate) - Number(userTimeSpent || 0));
  }

  if (status === STATUS_CLOSED && estimatedHours > totalTimeSpentByAllUsers) {
    remaining_time = estimatedHours - totalTimeSpentByAllUsers;
  }

  return { calculated_time, productivity, remaining_time, ...carryMetrics };
}

module.exports = {
  calculateProductivity,
};
