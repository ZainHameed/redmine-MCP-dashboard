/**
 * Bulk Tickets Controller
 * Handles bulk ticket creation endpoints
 */

const csvAdapter = require('../adapters/csv.adapter');
const ticketNormalizer = require('../services/ticket-normalizer.service');
const ticketCreation = require('../services/ticket-creation.service');
const redmineService = require('../services/redmine.service');
const { DEFAULT_PROJECT_ID, DEFAULT_STATUS_NAME, TRACKER_NAMES } = require('../config/constants');

/**
 * POST /api/bulk-tickets/preview
 * Accepts CSV file + ColumnMapping, returns TicketNode[] tree
 */
const preview = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }
    
    const columnMapping = req.body.mapping ? JSON.parse(req.body.mapping) : req.body;
    const userStoryId = req.body.userStoryId ? parseInt(req.body.userStoryId) : null;
    const projectId = req.body.projectId ? parseInt(req.body.projectId) : null;
    
    // Subject mapping is optional if Task column is mapped
    if (!columnMapping.subject && !columnMapping.task) {
      return res.status(400).json({ error: 'Subject or Task column mapping is required' });
    }
    
    // Parse CSV
    const rows = await csvAdapter.parseCSV(req.file.buffer.toString());
    
    if (rows.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty' });
    }
    
    // Get Redmine users - prefer project members if projectId is provided
    let redmineUsers = [];
    if (projectId) {
      try {
        const members = await redmineService.getProjectMembers(projectId);
        // Extract unique users from memberships
        const userMap = new Map();
        members.forEach(member => {
          if (member.user && member.user.id) {
            userMap.set(member.user.id, {
              id: member.user.id,
              name: member.user.name || `${member.user.firstname || ''} ${member.user.lastname || ''}`.trim() || `User ${member.user.id}`
            });
          }
        });
        redmineUsers = Array.from(userMap.values());
      } catch (error) {
        console.warn('Failed to get project members, falling back to all users:', error.message);
      }
    }
    
    // Fallback to all users if project members not available
    if (redmineUsers.length === 0) {
      try {
        const allUsers = await redmineService.getAllUsers();
        redmineUsers = allUsers.map(user => ({
          id: user.id,
          name: user.name
        }));
      } catch (error) {
        console.warn('Failed to get all users:', error.message);
        redmineUsers = [];
      }
    }
    
    // Get trackers and statuses
    const [trackers, statuses] = await Promise.all([
      redmineService.getTrackers(),
      redmineService.getStatuses()
    ]);
    
    // Map trackers
    const trackerMapping = mapTrackers(trackers);
    
    // Find "New" status ID
    const newStatus = statuses.find(s => 
      s.name.toLowerCase() === DEFAULT_STATUS_NAME.toLowerCase()
    );
    const statusId = newStatus ? newStatus.id : (statuses[0]?.id || 1);
    
    // Build tree (userStoryId already extracted above)
    const tree = ticketNormalizer.buildTicketTree(
      rows,
      columnMapping,
      redmineUsers,
      trackerMapping,
      statusId,
      userStoryId
    );
    
    res.json(tree);
    
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: error.message || 'Failed to preview tickets' });
  }
};

/**
 * GET /api/bulk-tickets/users
 * Returns simplified {id, name} list for dropdowns
 * Uses project memberships if projectId is provided, otherwise tries all users
 */
const getUsers = async (req, res) => {
  try {
    const { projectId } = req.query;
    let users = [];
    
    // If projectId is provided, get users from that project's memberships
    if (projectId) {
      const members = await redmineService.getProjectMembers(parseInt(projectId));
      // Extract unique users from memberships
      const userMap = new Map();
      members.forEach(member => {
        if (member.user && member.user.id) {
          userMap.set(member.user.id, {
            id: member.user.id,
            name: member.user.name || `${member.user.firstname || ''} ${member.user.lastname || ''}`.trim() || `User ${member.user.id}`
          });
        }
      });
      users = Array.from(userMap.values());
    }
    
    // If no users from project memberships, try to get all users (may fail due to permissions)
    if (users.length === 0) {
      try {
        const allUsers = await redmineService.getAllUsers();
        users = allUsers.map(user => ({
          id: user.id,
          name: user.name
        }));
      } catch (error) {
        console.warn('Failed to get all users, returning empty array:', error.message);
        users = [];
      }
    }
    
    // Sort by name
    users.sort((a, b) => a.name.localeCompare(b.name));
    
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    // Return empty array instead of error to allow table to display
    res.json([]);
  }
};

/**
 * GET /api/bulk-tickets/user-stories
 * Returns user stories for a project
 */
const getUserStories = async (req, res) => {
  try {
    const { projectId } = req.query;
    
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }
    
    const stories = await redmineService.getUserStories(parseInt(projectId));
    
    res.json(stories);
  } catch (error) {
    console.error('Get user stories error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch user stories' });
  }
};

/**
 * POST /api/bulk-tickets/execute
 * Accepts TicketNode[] tree, creates tickets, returns results
 * Supports Server-Sent Events (SSE) for progress updates
 */
const execute = async (req, res) => {
  try {
    const { tree, projectId } = req.body;
    
    if (!tree || !Array.isArray(tree) || tree.length === 0) {
      return res.status(400).json({ error: 'Tree is required and must not be empty' });
    }
    
    // Use provided projectId or default
    const targetProjectId = projectId || DEFAULT_PROJECT_ID;
    
    if (!targetProjectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    
    // Check if client wants SSE (via Accept header or query param)
    const useSSE = req.headers.accept && req.headers.accept.includes('text/event-stream');
    
    if (useSSE) {
      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Progress callback for SSE
      const progressCallback = (current, total) => {
        res.write(`data: ${JSON.stringify({ current, total, message: `Creating ${current}/${total} tickets...` })}\n\n`);
      };
      
      // Create tickets with progress updates
      const results = await ticketCreation.createTicketsFromTree(tree, targetProjectId, progressCallback);
      
      // Send final result
      res.write(`data: ${JSON.stringify({
        success: true,
        results,
        summary: {
          total: results.length,
          succeeded: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      })}\n\n`);
      res.end();
    } else {
      // Regular JSON response (for backward compatibility)
      const results = await ticketCreation.createTicketsFromTree(tree, targetProjectId);
      
      res.json({
        success: true,
        results,
        summary: {
          total: results.length,
          succeeded: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      });
    }
    
  } catch (error) {
    console.error('Execute error:', error);
    if (req.headers.accept && req.headers.accept.includes('text/event-stream')) {
      res.write(`data: ${JSON.stringify({ error: error.message || 'Failed to create tickets' })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: error.message || 'Failed to create tickets' });
    }
  }
};

/**
 * Map trackers to hierarchy levels
 */
const mapTrackers = (trackers) => {
  const mapping = {
    story: null,
    task: null,
    subtask: null
  };
  
  for (const tracker of trackers) {
    const name = tracker.name.toLowerCase();
    
    // Check for story
    if (TRACKER_NAMES.STORY.some(t => name.includes(t.toLowerCase()))) {
      mapping.story = tracker.id;
    }
    // Check for task
    else if (TRACKER_NAMES.TASK.some(t => name.includes(t.toLowerCase()))) {
      mapping.task = tracker.id;
    }
    // Check for subtask
    else if (TRACKER_NAMES.SUBTASK.some(t => name.includes(t.toLowerCase()))) {
      mapping.subtask = tracker.id;
    }
  }
  
  // Fallback: use first tracker for any missing mappings
  if (trackers.length > 0) {
    const defaultTracker = trackers[0].id;
    if (!mapping.story) mapping.story = defaultTracker;
    if (!mapping.task) mapping.task = defaultTracker;
    if (!mapping.subtask) mapping.subtask = defaultTracker;
  }
  
  return mapping;
};

/**
 * DELETE /api/bulk-tickets/cleanup
 * Delete test tickets (for testing phase cleanup)
 */
const cleanupTestTickets = async (req, res) => {
  try {
    const { ticketIds } = req.body;
    
    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({ error: 'ticketIds array is required' });
    }
    
    const results = [];
    const errors = [];
    
    for (const ticketId of ticketIds) {
      try {
        await redmineService.deleteIssue(ticketId);
        results.push({ id: ticketId, success: true });
      } catch (error) {
        errors.push({ id: ticketId, error: error.message });
        results.push({ id: ticketId, success: false, error: error.message });
      }
    }
    
    res.json({
      success: true,
      deleted: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });
    
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: error.message || 'Failed to cleanup tickets' });
  }
};

module.exports = {
  preview,
  getUsers,
  getUserStories,
  execute,
  cleanupTestTickets
};
