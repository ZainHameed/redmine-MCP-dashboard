/**
 * Bulk Tickets Routes
 * Defines routes for bulk ticket creation endpoints
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();
const bulkTicketsController = require('../controllers/bulk-tickets.controller');

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// POST /api/bulk-tickets/preview
router.post('/preview', upload.single('file'), bulkTicketsController.preview);

// GET /api/bulk-tickets/users
router.get('/users', bulkTicketsController.getUsers);

// GET /api/bulk-tickets/user-stories
router.get('/user-stories', bulkTicketsController.getUserStories);

// POST /api/bulk-tickets/execute
router.post('/execute', bulkTicketsController.execute);

// POST /api/bulk-tickets/cleanup (using POST since DELETE with body is not standard)
router.post('/cleanup', bulkTicketsController.cleanupTestTickets);

module.exports = router;
