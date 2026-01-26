/**
 * Users Controller
 * Handles user-related request logic
 */

const redmineService = require('../services/redmine.service');
const { WHITELISTED_PROJECTS } = require('../config/projects');

/**
 * Get users from whitelisted projects
 */
const getUsers = async (req, res) => {
  try {
    const allUsers = [];
    
    // Get users from each whitelisted project
    for (const project of WHITELISTED_PROJECTS) {
      const members = await redmineService.getProjectMembers(project.id);
      console.log(`Found ${members.length} members for project ${project.name}`);
      
      members.forEach(member => {
        if (member.user) {
          allUsers.push({
            id: member.user.id,
            name: member.user.name,
            login: member.user.login,
            project_id: project.id,
            project_name: project.name,
            roles: member.roles.map(role => role.name)
          });
        }
      });
    }
    
    console.log(`Total users found: ${allUsers.length}`);
    
    // Sort users alphabetically by name
    allUsers.sort((a, b) => a.name.localeCompare(b.name));
    
    res.json(allUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getUsers
};

