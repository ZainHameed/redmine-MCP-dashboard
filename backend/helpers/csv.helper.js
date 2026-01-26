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
  
  // Column headers
  csvContent += `User,Issue,Calculated Time (h),Time Spent (h),Productivity (%),Remaining Time (h)\n`;
  
  // User tickets with empty row between users
  allUsersData.forEach((userData, userIndex) => {
    userData.tickets.forEach(ticket => {
      const issueLabel = `${ticket.status} #${ticket.ticket}: ${ticket.subject}`;
      csvContent += `${escapeCsvValue(userData.userName)},`;
      csvContent += `${escapeCsvValue(issueLabel)},`;
      csvContent += `${ticket.calculated_time?.toFixed(2) || '0'},`;
      csvContent += `${ticket.time_spent?.toFixed(2) || '0'},`;
      csvContent += `${ticket.productivity !== null ? ticket.productivity : '0'},`;
      csvContent += `${ticket.remaining_time !== null ? ticket.remaining_time.toFixed(2) : '0'}\n`;
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
  csvContent += `User Name,Calculated Time (h),Time Spent (h),Productivity (%)\n`;
  
  // Add each user's summary
  allUsersData.forEach(userData => {
    csvContent += `${escapeCsvValue(userData.userName)},`;
    csvContent += `${userData.totalCalculatedTime.toFixed(2)},`;
    csvContent += `${userData.totalTimeSpent.toFixed(2)},`;
    csvContent += `${userData.avgProductivity.toFixed(2)}\n`;
  });
  
  // Grand totals
  csvContent += `\n`;
  csvContent += `GRAND TOTALS\n`;
  csvContent += `Total Users,Total Calculated Time (h),Total Time Spent (h),Average Productivity (%)\n`;
  csvContent += `${allUsersData.length},`;
  csvContent += `${grandTotalCalculatedTime.toFixed(2)},`;
  csvContent += `${grandTotalTimeSpent.toFixed(2)},`;
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

