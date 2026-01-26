/**
 * Tickets Routes
 * Defines routes for ticket-related endpoints
 */

const express = require('express');
const router = express.Router();
const ticketsController = require('../controllers/tickets.controller');

// GET /api/assigned-tasks
router.get('/assigned-tasks', ticketsController.getAssignedTasks);

// GET /api/tickets/:id
router.get('/:id', ticketsController.getTicketById);

module.exports = router;

