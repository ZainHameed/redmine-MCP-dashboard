/**
 * CSV Helper
 * Utilities for CSV generation and formatting
 */

/**
 * Escape CSV values to handle special characters
 * @param {*} value - Value to escape
 * @returns {string} Escaped CSV value
 */
const escapeCsvValue = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Generate CSV content from productivity data
 * @param {Array} allUsersData - Array of user data objects
 * @param {string} fromDate - Start date
 * @param {string} toDate - End date
 * @returns {string} CSV content
 */
const generateProductivityCSV = (allUsersData, fromDate, toDate) => {
  let csvContent = '';
  
  // Header
  const dateRangeLabel = fromDate && toDate ? `${fromDate} to ${toDate}` : 'All Time';
  csvContent += `Productivity Report - ${dateRangeLabel}\n`;
  csvContent += `Generated: ${new Date().toISOString()}\n`;
  csvContent += `\n`;
  
  // Column headers (Opening Estimate = prorated carry-over runway at period start)
  csvContent += `User,Issue,Opening Estimate (h),Hours Before Period (h),Time Spent (h),Calculated Time (h),Productivity (%),Remaining Time (h)\n`;
  
  // User tickets with empty row between users
  allUsersData.forEach((userData, userIndex) => {
    userData.tickets.forEach(ticket => {
      const trackerName = ticket.tracker || 'Unknown';
      const carrySuffix = ticket.carried_over ? ' [Carried Over]' : '';
      const issueLabel = `[${trackerName}] #${ticket.ticket}: ${ticket.subject}${carrySuffix}`;
      const openingStr =
        ticket.opening_estimate !== null && ticket.opening_estimate !== undefined
          ? Number(ticket.opening_estimate).toFixed(2)
          : '';
      const priorStr =
        ticket.hours_logged_before_period !== null && ticket.hours_logged_before_period !== undefined
          ? Number(ticket.hours_logged_before_period).toFixed(2)
          : '0';
      csvContent += `${escapeCsvValue(userData.userName)},`;
      csvContent += `${escapeCsvValue(issueLabel)},`;
      csvContent += `${openingStr},`;
      csvContent += `${priorStr},`;
      csvContent += `${ticket.time_spent?.toFixed(2) || '0'},`;
      csvContent += `${ticket.calculated_time?.toFixed(2) || '0'},`;
      csvContent += `${ticket.productivity !== null ? ticket.productivity : '0'},`;
      const remainingStr =
        ticket.remaining_time !== null && ticket.remaining_time !== undefined
          ? Number(ticket.remaining_time).toFixed(2)
            : '';
      csvContent += `${remainingStr}\n`;
    });
    
    // Add empty row after each user's tickets (except the last user)
    if (userIndex < allUsersData.length - 1) {
      csvContent += `\n`;
    }
  });
  
  // Calculate grand totals
  const grandTotalCalculatedTime = allUsersData.reduce((sum, u) => sum + u.totalCalculatedTime, 0);
  const grandTotalTimeSpent = allUsersData.reduce((sum, u) => sum + u.totalTimeSpent, 0);
  const grandAvgProductivity = grandTotalTimeSpent > 0 ? (grandTotalCalculatedTime / grandTotalTimeSpent) * 100 : 0;
  
  // Overall summary with individual user breakdown
  csvContent += `OVERALL SUMMARY (All Selected Users)\n`;
  csvContent += `\n`;
  csvContent += `User Name,Time Spent (h),Calculated Time (h),Productivity (%)\n`;
  
  // Add each user's summary
  allUsersData.forEach(userData => {
    csvContent += `${escapeCsvValue(userData.userName)},`;
    csvContent += `${userData.totalTimeSpent.toFixed(2)},`;
    csvContent += `${userData.totalCalculatedTime.toFixed(2)},`;
    csvContent += `${userData.avgProductivity.toFixed(2)}\n`;
  });
  
  // Grand totals
  csvContent += `\n`;
  csvContent += `GRAND TOTALS\n`;
  csvContent += `Total Users,Total Time Spent (h),Total Calculated Time (h),Average Productivity (%)\n`;
  csvContent += `${allUsersData.length},`;
  csvContent += `${grandTotalTimeSpent.toFixed(2)},`;
  csvContent += `${grandTotalCalculatedTime.toFixed(2)},`;
  csvContent += `${grandAvgProductivity.toFixed(2)}\n`;
  
  return csvContent;
};

/**
 * Generate CSV filename from date range
 * @param {string} fromDate - Start date
 * @param {string} toDate - End date
 * @returns {string} Filename
 */
const generateCSVFilename = (fromDate, toDate) => {
  return `productivity_report_${fromDate || 'all'}_to_${toDate || 'all'}.csv`;
};

module.exports = {
  escapeCsvValue,
  generateProductivityCSV,
  generateCSVFilename
};

