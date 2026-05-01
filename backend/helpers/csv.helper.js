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

const applyOpeningEstimateCap = (ticket) => {
  if (ticket.opening_estimate === null || ticket.opening_estimate === undefined) {
    return ticket;
  }

  const timeSpent = Number(ticket.time_spent || 0);
  const cappedCalculatedTime = Math.min(
    Number(ticket.calculated_time || 0),
    Number(ticket.opening_estimate)
  );

  return {
    ...ticket,
    productivity: timeSpent > 0 ? Math.round((cappedCalculatedTime / timeSpent) * 100) : null,
  };
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
  const cappedUsersData = allUsersData.map((userData) => {
    const tickets = userData.tickets.map(applyOpeningEstimateCap);
    const totalCalculatedTime = tickets.reduce((sum, ticket) => sum + Number(ticket.calculated_time || 0), 0);
    const totalProductivityBasis = tickets.reduce((sum, ticket) => {
      if (ticket.opening_estimate === null || ticket.opening_estimate === undefined) {
        return sum + Number(ticket.calculated_time || 0);
      }
      return sum + Math.min(Number(ticket.calculated_time || 0), Number(ticket.opening_estimate));
    }, 0);
    const totalTimeSpent = tickets.reduce((sum, ticket) => sum + Number(ticket.time_spent || 0), 0);
    return {
      ...userData,
      tickets,
      totalCalculatedTime,
      totalProductivityBasis,
      totalTimeSpent,
      avgProductivity: totalTimeSpent > 0 ? (totalProductivityBasis / totalTimeSpent) * 100 : 0,
    };
  });
  
  // Header
  const dateRangeLabel = fromDate && toDate ? `${fromDate} to ${toDate}` : 'All Time';
  csvContent += `Productivity Report - ${dateRangeLabel}\n`;
  csvContent += `Generated: ${new Date().toISOString()}\n`;
  csvContent += `\n`;
  
  // Column headers (Opening Estimate = prorated carry-over runway at period start)
  csvContent += `User,Issue,Opening Estimate (h),Hours Before Period (h),Time Spent (h),Calculated Time (h),Productivity (%),Remaining Time (h)\n`;
  
  // User tickets with empty row between users
  cappedUsersData.forEach((userData, userIndex) => {
    userData.tickets.forEach(ticket => {
      const trackerName = ticket.tracker || 'Unknown';
      const carrySuffix = ticket.carried_over ? ' [Carried Over]' : '';
      const resolutionSuffix = ticket.resolution_label ? ` [${ticket.resolution_label}]` : '';
      const issueLabel = `[${trackerName}] #${ticket.ticket}: ${ticket.subject}${carrySuffix}${resolutionSuffix}`;
      const openingStr =
        ticket.opening_estimate !== null && ticket.opening_estimate !== undefined
          ? Number(ticket.opening_estimate).toFixed(2)
          : '';
      const priorStr =
        ticket.hours_logged_before_period !== null && ticket.hours_logged_before_period !== undefined
          ? Number(ticket.hours_logged_before_period).toFixed(2)
          : '0';
      const displayTimeSpent = Number(ticket.time_spent || 0);
      const displayCalculatedTime = Number(ticket.calculated_time || 0);
      const productivityBasis =
        ticket.opening_estimate !== null && ticket.opening_estimate !== undefined
          ? Math.min(displayCalculatedTime, Number(ticket.opening_estimate))
          : displayCalculatedTime;
      const displayProductivity =
        displayTimeSpent > 0
          ? Math.round((productivityBasis / displayTimeSpent) * 100)
          : 0;
      csvContent += `${escapeCsvValue(userData.userName)},`;
      csvContent += `${escapeCsvValue(issueLabel)},`;
      csvContent += `${openingStr},`;
      csvContent += `${priorStr},`;
      csvContent += `${displayTimeSpent.toFixed(2)},`;
      csvContent += `${displayCalculatedTime.toFixed(2)},`;
      csvContent += `${displayProductivity},`;
      const remainingStr =
        ticket.remaining_time !== null && ticket.remaining_time !== undefined
          ? Number(ticket.remaining_time).toFixed(2)
            : '';
      csvContent += `${remainingStr}\n`;
    });
    
    // Add empty row after each user's tickets (except the last user)
    if (userIndex < cappedUsersData.length - 1) {
      csvContent += `\n`;
    }
  });
  
  // Calculate grand totals
  const grandTotalCalculatedTime = cappedUsersData.reduce((sum, u) => sum + u.totalCalculatedTime, 0);
  const grandTotalProductivityBasis = cappedUsersData.reduce((sum, u) => sum + u.totalProductivityBasis, 0);
  const grandTotalTimeSpent = cappedUsersData.reduce((sum, u) => sum + u.totalTimeSpent, 0);
  const grandAvgProductivity = grandTotalTimeSpent > 0 ? (grandTotalProductivityBasis / grandTotalTimeSpent) * 100 : 0;
  
  // Overall summary with individual user breakdown
  csvContent += `OVERALL SUMMARY (All Selected Users)\n`;
  csvContent += `\n`;
  csvContent += `User Name,Time Spent (h),Calculated Time (h),Productivity (%)\n`;
  
  // Add each user's summary
  cappedUsersData.forEach(userData => {
    csvContent += `${escapeCsvValue(userData.userName)},`;
    csvContent += `${userData.totalTimeSpent.toFixed(2)},`;
    csvContent += `${userData.totalCalculatedTime.toFixed(2)},`;
    csvContent += `${userData.avgProductivity.toFixed(2)}\n`;
  });
  
  // Grand totals
  csvContent += `\n`;
  csvContent += `GRAND TOTALS\n`;
  csvContent += `Total Users,Total Time Spent (h),Total Calculated Time (h),Average Productivity (%)\n`;
  csvContent += `${cappedUsersData.length},`;
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

