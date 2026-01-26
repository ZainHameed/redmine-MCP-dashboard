/**
 * Tickets Controller
 * Handles ticket-related request logic
 */

const redmineService = require('../services/redmine.service');
const { getWhitelistedProjectIds } = require('../config/projects');

/**
 * Get assigned tasks for a specific user and project
 */
const getAssignedTasks = async (req, res) => {
  const { project_id, user_id } = req.query;
  
  // Validate that project_id is whitelisted
  if (project_id && !getWhitelistedProjectIds().includes(parseInt(project_id))) {
    return res.status(400).json({ 
      error: 'Project not whitelisted for productivity features',
      whitelisted_projects: require('../config/projects').WHITELISTED_PROJECTS
    });
  }
  
  try {
    const issues = await redmineService.getOpenIssues(project_id, user_id);
    res.json(issues);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get ticket details by ID
 */
const getTicketById = async (req, res) => {
  const ticketId = req.params.id;
  try {
    const issue = await redmineService.getIssueById(ticketId);
    res.json(issue);
  } catch (error) {
    res.status(404).json({ error: 'Ticket not found.' });
  }
};

module.exports = {
  getAssignedTasks,
  getTicketById
};

