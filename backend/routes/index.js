/**
 * Routes Index
 * Aggregates and exports all route modules
 */

const express = require('express');
const router = express.Router();

const projectsRoutes = require('./projects.routes');
const usersRoutes = require('./users.routes');
const ticketsRoutes = require('./tickets.routes');
const productivityRoutes = require('./productivity.routes');
const healthRoutes = require('./health.routes');

// Register route modules
router.use('/projects', projectsRoutes);
router.use('/users', usersRoutes);
router.use('/assigned-tasks', ticketsRoutes); // Note: /assigned-tasks is handled in tickets.routes
router.use('/tickets', ticketsRoutes);
router.use('/productivity', productivityRoutes);
router.use('/health', healthRoutes);

module.exports = router;

