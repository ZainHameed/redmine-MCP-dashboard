/**
 * Projects Controller
 * Handles project-related request logic
 */

const redmineService = require('../services/redmine.service');

/**
 * Get all Redmine projects
 */
const getProjects = async (req, res) => {
  try {
    const projects = await redmineService.getProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getProjects
};

