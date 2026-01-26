/**
 * Users Routes
 * Defines routes for user-related endpoints
 */

const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');

// GET /api/users
router.get('/', usersController.getUsers);

module.exports = router;

