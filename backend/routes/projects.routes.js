/**
 * Projects Routes
 * Defines routes for project-related endpoints
 */

const express = require('express');
const router = express.Router();
const projectsController = require('../controllers/projects.controller');

// GET /api/projects
router.get('/', projectsController.getProjects);

module.exports = router;

