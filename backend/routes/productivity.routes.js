/**
 * Productivity Routes
 * Defines routes for productivity-related endpoints
 */

const express = require('express');
const router = express.Router();
const productivityController = require('../controllers/productivity.controller');

// GET /api/productivity/versions?project_id=944 — open target versions (Panavid)
router.get('/versions', productivityController.getOpenTargetVersions);

// GET /api/productivity
router.get('/', productivityController.getProductivity);

// GET /api/productivity/export
router.get('/export', productivityController.exportProductivity);

module.exports = router;

