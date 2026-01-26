/**
 * Redmine MCP Dashboard - Backend Server
 * Main entry point for the Express application
 */

const express = require('express');
const cors = require('cors');

// Import configuration
const { PORT, validateEnvironment } = require('./config/environment');

// Import routes
const routes = require('./routes');

// Validate environment on startup
validateEnvironment();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Register API routes
app.use('/api', routes);

// Start server
app.listen(PORT, () => {
  const { APP_VERSION, NODE_ENV } = require('./config/environment');
  console.log(`Backend server running on port ${PORT}`);
  console.log(`App version: ${APP_VERSION}`);
  console.log(`Environment: ${NODE_ENV}`);
});
