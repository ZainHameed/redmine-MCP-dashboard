/**
 * Health Controller
 * Handles health check and status endpoints
 */

const { APP_VERSION, NODE_ENV, REDMINE_HOST } = require('../config/environment');

/**
 * Health check endpoint
 */
const getHealth = (req, res) => {
  res.json({
    status: 'healthy',
    version: APP_VERSION,
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    },
    redmine: {
      configured: true, // Always true since we validate at startup
      host: REDMINE_HOST ? 'configured' : 'not configured'
    }
  });
};

module.exports = {
  getHealth
};

