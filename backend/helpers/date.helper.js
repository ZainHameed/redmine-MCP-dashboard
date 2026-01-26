/**
 * Date Helper
 * Utilities for date parsing and formatting
 */

/**
 * Parse date string to Date object
 * @param {string} dateString - Date string
 * @returns {Date} Date object
 */
const parseDate = (dateString) => {
  return new Date(dateString);
};

/**
 * Check if date is in range
 * @param {string} date - Date to check
 * @param {string} fromDate - Start date (optional)
 * @param {string} toDate - End date (optional)
 * @returns {boolean} True if date is in range
 */
const isDateInRange = (date, fromDate, toDate) => {
  const checkDate = new Date(date);
  
  if (fromDate && checkDate < new Date(fromDate)) {
    return false;
  }
  
  if (toDate && checkDate > new Date(toDate)) {
    return false;
  }
  
  return true;
};

module.exports = {
  parseDate,
  isDateInRange
};

