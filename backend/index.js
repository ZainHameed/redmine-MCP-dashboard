const express = require('express');
const axios = require('axios');
const cors = require('cors');

// Load environment variables
require('dotenv').config();

// Import project constants
const { WHITELISTED_PROJECTS, getWhitelistedProjectIds, getWhitelistedProjectNames } = require('./config/projects');

const app = express();
app.use(cors());
app.use(express.json());

// Environment variables - NO FALLBACKS
const REDMINE_HOST = process.env.REDMINE_HOST;
const REDMINE_API_KEY = process.env.REDMINE_API_KEY;
const PORT = process.env.PORT || 3000;
const APP_VERSION = process.env.APP_VERSION || '1.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Validate required environment variables
const validateEnvironment = () => {
  const missingVars = [];
  
  if (!REDMINE_HOST) {
    missingVars.push('REDMINE_HOST');
  }
  
  if (!REDMINE_API_KEY) {
    missingVars.push('REDMINE_API_KEY');
  }
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n📝 Please set these variables in your .env file');
    console.error('💡 Copy .env.template to .env and update with your values');
    process.exit(1);
  }
  
  console.log('✅ Environment variables validated successfully');
};

// Validate environment on startup
validateEnvironment();

// API endpoint to fetch Redmine projects
app.get('/api/projects', async (req, res) => {
  try {
    const response = await axios.get(REDMINE_HOST, {
      headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
    });
    res.json(response.data.projects || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to get project ID by name
async function getProjectIdByName(name) {
  try {
    const response = await axios.get(REDMINE_HOST, {
      headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
    });
    const project = (response.data.projects || []).find(p => p.name === name);
    return project ? project.id : null;
  } catch {
    return null;
  }
}

// Get assigned tasks for a specific user and project
app.get('/api/assigned-tasks', async (req, res) => {
  const { project_id, user_id } = req.query;
  
  // Validate that project_id is whitelisted
  if (project_id && !getWhitelistedProjectIds().includes(parseInt(project_id))) {
    return res.status(400).json({ 
      error: 'Project not whitelisted for productivity features',
      whitelisted_projects: WHITELISTED_PROJECTS
    });
  }
  
  try {
    let issuesUrl = `${REDMINE_HOST.replace('/projects.json', '')}/issues.json?status_id=open`;
    
    if (project_id) {
      issuesUrl += `&project_id=${project_id}`;
    }
    
    if (user_id) {
      issuesUrl += `&assigned_to_id=${user_id}`;
    } else {
      // Default to current user if no user_id specified
      issuesUrl += `&assigned_to_id=me`;
    }
    
    const response = await axios.get(issuesUrl, {
      headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
    });
    res.json(response.data.issues || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Time logging endpoints removed per requirements - only Projects and Productivity tabs needed

// Get users from whitelisted projects (for user selection)
app.get('/api/users', async (req, res) => {
  try {
    const allUsers = [];
    
    // Get users from each whitelisted project
    for (const project of WHITELISTED_PROJECTS) {
      try {
        const membersUrl = `${REDMINE_HOST.replace('/projects.json', '')}/projects/${project.id}/memberships.json?limit=100`;
        const response = await axios.get(membersUrl, {
          headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
        });
        
        const members = response.data.memberships || [];
        members.forEach(member => {
          if (member.user && !allUsers.find(u => u.id === member.user.id)) {
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
      } catch (error) {
        console.warn(`Failed to get members for project ${project.name}:`, error.message);
      }
    }
    
    res.json(allUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get productivity data for a user across selected projects
app.get('/api/productivity', async (req, res) => {
  try {
    const { user_id, project_ids, from_date, to_date } = req.query;
    
    console.log('Productivity API called with:', { user_id, project_ids, from_date, to_date });
    
    if (!user_id || !project_ids) {
      return res.status(400).json({ error: 'user_id and project_ids are required' });
    }

    const projectIds = Array.isArray(project_ids) ? project_ids : project_ids.split(',').map(id => id.trim());
    console.log('Parsed project IDs:', projectIds);
    
    // Validate project IDs against whitelisted projects
    const validProjectIds = projectIds.filter(id => 
      getWhitelistedProjectIds().includes(parseInt(id))
    );
    console.log('Valid project IDs:', validProjectIds);
    
    if (validProjectIds.length === 0) {
      return res.status(400).json({ error: 'No valid project IDs provided' });
    }

    const productivityData = [];
    
    for (const projectId of validProjectIds) {
      try {
        // Get assigned issues for the user in this project
        const issuesUrl = `${REDMINE_HOST.replace('/projects.json', '')}/issues.json?assigned_to_id=${user_id}&project_id=${projectId}&status_id=*&limit=100`;
        const issuesResponse = await axios.get(issuesUrl, {
          headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
        });
        
        const issues = issuesResponse.data.issues || [];
        
        for (const issue of issues) {
          // Get time entries for this issue
          const timeEntriesUrl = `${REDMINE_HOST.replace('/projects.json', '')}/time_entries.json?issue_id=${issue.id}&user_id=${user_id}`;
          let timeEntries = [];
          
          try {
            const timeResponse = await axios.get(timeEntriesUrl, {
              headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
            });
            timeEntries = timeResponse.data.time_entries || [];
          } catch (timeError) {
            console.warn(`Failed to get time entries for issue ${issue.id}:`, timeError.message);
          }
          
          // Calculate total time spent (use all time entries, not filtered by date)
          const totalTimeSpent = timeEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
          
          // Filter issues by creation/update date if provided
          let includeIssue = true;
          if (from_date && to_date) {
            const issueCreatedDate = new Date(issue.created_on);
            const issueUpdatedDate = new Date(issue.updated_on);
            const fromDate = new Date(from_date);
            const toDate = new Date(to_date);
            
            // Include issue if it was created or updated in the date range
            includeIssue = (issueCreatedDate >= fromDate && issueCreatedDate <= toDate) ||
                         (issueUpdatedDate >= fromDate && issueUpdatedDate <= toDate);
          }
          
          if (!includeIssue) {
            continue; // Skip this issue if it's not in the date range
          }
          
          // Calculate productivity (estimated_hours / actual_hours * 100)
          let productivity = null;
          if (issue.estimated_hours && totalTimeSpent > 0) {
            productivity = Math.round((issue.estimated_hours / totalTimeSpent) * 100);
          }
          
          productivityData.push({
            ticket: issue.id,
            subject: issue.subject,
            estimated_hours: issue.estimated_hours || null,
            time_spent: totalTimeSpent,
            productivity: productivity,
            created_on: issue.created_on,
            updated_on: issue.updated_on,
            status: issue.status?.name || 'Unknown',
            project_id: projectId,
            project_name: WHITELISTED_PROJECTS.find(p => p.id === parseInt(projectId))?.name || 'Unknown'
          });
        }
      } catch (error) {
        console.warn(`Failed to get productivity data for project ${projectId}:`, error.message);
      }
    }
    
    res.json(productivityData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ticket details by ID
app.get('/api/tickets/:id', async (req, res) => {
  const ticketId = req.params.id;
  try {
    const url = `${REDMINE_HOST.replace('/projects.json', '')}/issues/${ticketId}.json`;
    const response = await axios.get(url, {
      headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
    });
    res.json(response.data.issue || {});
  } catch (error) {
    res.status(404).json({ error: 'Ticket not found.' });
  }
});

// Ticket time logs endpoint removed per requirements - time logging features not needed

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: APP_VERSION,
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    },
    redmine: {
      configured: true, // Always true since we validate at startup
      host: REDMINE_HOST ? 'configured' : 'not configured'
    }
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`App version: ${APP_VERSION}`);
  console.log(`Environment: ${NODE_ENV}`);
}); 