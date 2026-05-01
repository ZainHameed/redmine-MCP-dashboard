/**
 * Productivity Service
 * Handles productivity calculations and time tracking logic
 */

const { getTimeEntriesForIssue } = require('./redmine.service');
const { STATUS_CLOSED, KEYWORD_TBD, KEYWORD_PROJECT_MANAGEMENT, KEYWORD_DEPLOYMENT } = require('../config/constants');

const UNRESOLVED_STATUS_IDS = new Set([1, 2]);

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

function isResolvedStatus(statusId) {
  const parsed = parseInt(statusId, 10);
  return !isNaN(parsed) && !UNRESOLVED_STATUS_IDS.has(parsed);
}

function extractStatusId(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return value;

  const raw = String(value).trim();
  const parenthesizedId = raw.match(/\((\d+)\)\s*$/);
  const parsed = parenthesizedId ? parseInt(parenthesizedId[1], 10) : parseInt(raw, 10);

  return isNaN(parsed) ? null : parsed;
}

function getEstimatedHours(issue) {
  return issue.estimated_hours
    || issue.hours_tracking?.estimated_hours
    || issue.hours_tracking?.total_estimated_hours
    || 0;
}

function getStatusChanges(issue) {
  return (issue.journals || [])
    .flatMap((journal) => {
      const changedOn = new Date(journal.created_on || journal.date);
      if (isNaN(changedOn.getTime())) return [];

      const redmineDetails = (journal.details || [])
        .filter((detail) => detail.name === 'status_id')
        .map((detail) => ({
          changedOn,
          oldStatusId: extractStatusId(detail.old_value),
          newStatusId: extractStatusId(detail.new_value),
        }));

      const normalizedUpdates = (journal.updates || [])
        .filter((update) => update.property === 'status' || update.property === 'status_id')
        .map((update) => ({
          changedOn,
          oldStatusId: extractStatusId(update.from),
          newStatusId: extractStatusId(update.to),
        }))
        .filter((change) => !isNaN(change.newStatusId));

      return [...redmineDetails, ...normalizedUpdates]
        .filter((change) => change.newStatusId !== null && !isNaN(change.newStatusId));
    })
    .sort((a, b) => a.changedOn - b.changedOn);
}

function getPeriodBoundaries(fromDate, toDate) {
  const periodStart = fromDate ? new Date(fromDate) : null;
  const periodEnd = toDate ? new Date(toDate) : null;

  if (periodStart && !isNaN(periodStart.getTime())) {
    periodStart.setHours(0, 0, 0, 0);
  }

  if (periodEnd && !isNaN(periodEnd.getTime())) {
    periodEnd.setHours(23, 59, 59, 999);
  }

  return {
    periodStart: periodStart && !isNaN(periodStart.getTime()) ? periodStart : null,
    periodEnd: periodEnd && !isNaN(periodEnd.getTime()) ? periodEnd : null,
  };
}

function getStatusAt(issue, cutoffDate, statusChanges) {
  const currentStatusId = extractStatusId(issue.status?.id);
  if (!cutoffDate || isNaN(cutoffDate.getTime())) {
    return currentStatusId === null || isNaN(currentStatusId) ? null : currentStatusId;
  }

  const changesBeforeCutoff = statusChanges.filter((change) => change.changedOn <= cutoffDate);
  const futureChanges = statusChanges.filter((change) => change.changedOn > cutoffDate);
  if (futureChanges.length > 0) {
    const firstFutureChange = futureChanges[0];
    if (firstFutureChange.oldStatusId !== null && !isNaN(firstFutureChange.oldStatusId)) {
      return firstFutureChange.oldStatusId;
    }
    if (changesBeforeCutoff.length > 0) {
      return changesBeforeCutoff[changesBeforeCutoff.length - 1].newStatusId;
    }
    return currentStatusId === null || isNaN(currentStatusId) ? null : currentStatusId;
  }

  if (changesBeforeCutoff.length > 0) {
    return changesBeforeCutoff[changesBeforeCutoff.length - 1].newStatusId;
  }

  return currentStatusId === null || isNaN(currentStatusId) ? null : currentStatusId;
}

function getResolutionState(issue, fromDate, toDate) {
  const statusChanges = getStatusChanges(issue);
  const { periodStart, periodEnd } = getPeriodBoundaries(fromDate, toDate);
  const effectiveEnd = periodEnd || new Date();
  const statusAtPeriodEnd = getStatusAt(issue, effectiveEnd, statusChanges);
  const statusBeforePeriod = periodStart
    ? getStatusAt(issue, new Date(periodStart.getTime() - 1), statusChanges)
    : null;
  const resolvedBeforePeriod = periodStart ? isResolvedStatus(statusBeforePeriod) : false;
  const resolvedDuringPeriod = statusChanges.some((change) => {
    const afterStart = !periodStart || change.changedOn >= periodStart;
    return afterStart && change.changedOn <= effectiveEnd && isResolvedStatus(change.newStatusId);
  });
  const resolvedAtPeriodEnd = isResolvedStatus(statusAtPeriodEnd);

  return {
    resolvedBeforePeriod,
    resolvedThisPeriod: !resolvedBeforePeriod && (resolvedDuringPeriod || resolvedAtPeriodEnd),
    isResolvedForPeriod: resolvedBeforePeriod || resolvedDuringPeriod || resolvedAtPeriodEnd,
    resolution_label: resolvedBeforePeriod ? 'Prev. Resolved' : (!resolvedBeforePeriod && (resolvedDuringPeriod || resolvedAtPeriodEnd) ? 'Resolved' : null),
  };
}

function getEntriesInPeriod(entries, fromDate, toDate) {
  const { periodStart, periodEnd } = getPeriodBoundaries(fromDate, toDate);
  return entries.filter((entry) => {
    const spentOn = new Date(entry.spent_on);
    if (isNaN(spentOn.getTime())) return false;
    if (periodStart && spentOn < periodStart) return false;
    if (periodEnd && spentOn > periodEnd) return false;
    return true;
  });
}

function finalizeProductivityResult(result, userTimeSpent, carryMetrics, resolutionState) {
  const finalCalculatedTime = Number(result.calculated_time || 0);
  let productivityBasis = finalCalculatedTime;

  if (
    carryMetrics.opening_estimate !== null &&
    carryMetrics.opening_estimate !== undefined &&
    productivityBasis > Number(carryMetrics.opening_estimate)
  ) {
    productivityBasis = Number(carryMetrics.opening_estimate);
  }

  const finalProductivity =
    result.productivity === null || result.productivity === undefined
      ? result.productivity
      : userTimeSpent > 0
        ? Math.round((productivityBasis / userTimeSpent) * 100)
        : null;

  return {
    ...result,
    calculated_time: finalCalculatedTime,
    productivity_basis: productivityBasis,
    productivity: finalProductivity,
    resolvedBeforePeriod: resolutionState.resolvedBeforePeriod,
    resolvedThisPeriod: resolutionState.resolvedThisPeriod,
    isResolvedForPeriod: resolutionState.isResolvedForPeriod,
    resolution_label: resolutionState.resolution_label,
  };
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
  const estimatedHours = getEstimatedHours(issue);
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
  const resolutionState = getResolutionState(issue, fromDate, toDate);
  const periodEntriesForIssue = getEntriesInPeriod(sortedTimeEntries, fromDate, toDate);
  const totalTimeSpentInPeriodByAllUsers = periodEntriesForIssue.reduce((sum, entry) => sum + (entry.hours || 0), 0);
  const totalTimeSpentByAllUsers = allTimeEntriesForIssue.reduce((sum, entry) => sum + (entry.hours || 0), 0);
  const adjustedCarryMetrics = resolutionState.resolvedBeforePeriod
    ? { ...carryMetrics, opening_estimate: 0 }
    : carryMetrics;

  if (resolutionState.resolvedBeforePeriod) {
    calculated_time = 0;
    productivity = userTimeSpent > 0 ? 0 : null;
    remaining_time = 0;
    return finalizeProductivityResult(
      { calculated_time, productivity, remaining_time, ...adjustedCarryMetrics },
      userTimeSpent,
      adjustedCarryMetrics,
      resolutionState
    );
  }

  if (resolutionState.resolvedThisPeriod && estimatedHours > 0) {
    const distributionBase = totalTimeSpentInPeriodByAllUsers || userTimeSpent;
    const resolvedCreditHours = adjustedCarryMetrics.opening_estimate !== null && adjustedCarryMetrics.opening_estimate !== undefined
      ? Number(adjustedCarryMetrics.opening_estimate)
      : estimatedHours;
    calculated_time = distributionBase > 0
      ? (userTimeSpent / distributionBase) * resolvedCreditHours
      : 0;
    productivity = userTimeSpent > 0 ? Math.round((calculated_time / userTimeSpent) * 100) : null;
    remaining_time = 0;
    return finalizeProductivityResult(
      { calculated_time, productivity, remaining_time, ...adjustedCarryMetrics },
      userTimeSpent,
      adjustedCarryMetrics,
      resolutionState
    );
  }

  // Rule 6.1: If estimated time is N/A then calculated_time = 0 and productivity = 0%
  if (!estimatedHours) {
    if (hasTBD) {
      calculated_time = userTimeSpent;
      productivity = 100;
    } else {
      calculated_time = 0;
      productivity = userTimeSpent > 0 ? 0 : null;
    }
    return finalizeProductivityResult(
      { calculated_time, productivity, remaining_time, ...adjustedCarryMetrics },
      userTimeSpent,
      adjustedCarryMetrics,
      resolutionState
    );
  }

  const uniqueUsers = [...new Set(allTimeEntriesForIssue.map(entry => entry.user?.id))].filter(Boolean);
  const multipleUsersLogged = uniqueUsers.length > 1;

  // Rule 6.2 & 6.3: For closed tickets with multiple users
  if (status === STATUS_CLOSED && multipleUsersLogged) {
    calculated_time = userTimeSpent;
    productivity = userTimeSpent > 0 ? 100 : null;

    if (isPMOrDeployment && estimatedHours > totalTimeSpentByAllUsers) {
      remaining_time = estimatedHours - totalTimeSpentByAllUsers;
    }

    return finalizeProductivityResult(
      { calculated_time, productivity, remaining_time, ...adjustedCarryMetrics },
      userTimeSpent,
      adjustedCarryMetrics,
      resolutionState
    );
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
    return finalizeProductivityResult(
      { calculated_time, productivity, remaining_time, ...adjustedCarryMetrics },
      userTimeSpent,
      adjustedCarryMetrics,
      resolutionState
    );
  }

  if (userTimeSpent === 0) {
    return finalizeProductivityResult(
      { calculated_time: 0, productivity: null, remaining_time, ...adjustedCarryMetrics },
      userTimeSpent,
      adjustedCarryMetrics,
      resolutionState
    );
  }

  if (remainingEstimated <= 0) {
    remaining_time = 0;
    return finalizeProductivityResult(
      { calculated_time: 0, productivity: 0, remaining_time, ...adjustedCarryMetrics },
      userTimeSpent,
      adjustedCarryMetrics,
      resolutionState
    );
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

  return finalizeProductivityResult(
    { calculated_time, productivity, remaining_time, ...adjustedCarryMetrics },
    userTimeSpent,
    adjustedCarryMetrics,
    resolutionState
  );
}

module.exports = {
  calculateProductivity,
};
