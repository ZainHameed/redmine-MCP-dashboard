/**
 * CSV Adapter
 * Implements Adapter Pattern to decouple CSV parsing from core logic
 * Future: Can be replaced with googleSheets.adapter.js without changing core logic
 */

const csv = require('csv-parser');
const { Readable } = require('stream');

/**
 * Parse CSV file and return flat array of rows
 * @param {Buffer|string} fileContent - CSV file content (buffer or string)
 * @returns {Promise<Array<Object>>} Array of row objects with column names as keys
 */
const parseCSV = (fileContent) => {
  return new Promise((resolve, reject) => {
    const rows = [];
    // Convert buffer to string if needed
    const content = Buffer.isBuffer(fileContent) ? fileContent.toString('utf-8') : fileContent;
    const stream = Readable.from(content);

    stream
      .pipe(csv())
      .on('data', (row) => {
        rows.push(row);
      })
      .on('end', () => {
        resolve(rows);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

/**
 * Validate CSV headers
 * @param {string[]} headers - Array of CSV column names
 * @param {string[]} requiredColumns - Array of required column names
 * @returns {Object} {valid: boolean, missing: string[]}
 */
const validateCSVHeaders = (headers, requiredColumns = []) => {
  const missing = requiredColumns.filter(col => !headers.includes(col));
  return {
    valid: missing.length === 0,
    missing
  };
};

/**
 * Extract headers from CSV rows
 * @param {Array<Object>} rows - Parsed CSV rows
 * @returns {string[]} Array of column names
 */
const extractHeaders = (rows) => {
  if (rows.length === 0) return [];
  return Object.keys(rows[0]);
};

module.exports = {
  parseCSV,
  validateCSVHeaders,
  extractHeaders
};
