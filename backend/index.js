const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());

// Load Redmine MCP config
const configPath = path.join(__dirname, '../.cursor/mcp.json');
let redmineConfig = {};
if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  redmineConfig = config['mcp-server-redmine'] || {};
}

const REDMINE_HOST = redmineConfig.REDMINE_HOST;
const REDMINE_API_KEY = redmineConfig.REDMINE_API_KEY;

// API endpoint to fetch Redmine projects
app.get('/api/projects', async (req, res) => {
  if (!REDMINE_HOST || !REDMINE_API_KEY) {
    return res.status(500).json({ error: 'Redmine MCP config missing.' });
  }
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

// Assigned tasks for Panavid Fixed Cost Projects and user zain.hameed
app.get('/api/assigned-tasks', async (req, res) => {
  const projectName = 'Panavid Fixed Cost Projects';
  const username = 'zain.hameed';
  try {
    const projectId = await getProjectIdByName(projectName);
    if (!projectId) return res.json([]);
    // Redmine issues API: filter by project_id, assigned_to_id=me
    const issuesUrl = `https://redmine.rolustech.com/issues.json?project_id=${projectId}&assigned_to_id=me&status_id=open`;
    const response = await axios.get(issuesUrl, {
      headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
    });
    res.json(response.data.issues || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Time log for Panavid Fixed Cost Projects and user zain.hameed for a given date range
app.get('/api/timelog', async (req, res) => {
  const projectName = 'Panavid Fixed Cost Projects';
  const username = 'zain.hameed';
  const { from, to } = req.query;
  try {
    const projectId = await getProjectIdByName(projectName);
    if (!projectId) return res.json([]);
    let timeUrl = `https://redmine.rolustech.com/time_entries.json?project_id=${projectId}&user_id=me`;
    if (from) timeUrl += `&from=${from}`;
    if (to) timeUrl += `&to=${to}`;
    const response = await axios.get(timeUrl, {
      headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
    });
    res.json(response.data.time_entries || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Log time entry for a ticket, only if it belongs to Panavid Fixed Cost Projects
app.post('/api/timelog', express.json(), async (req, res) => {
  const { hours, ticket, date, comment } = req.body;
  if (!hours || !ticket || !date) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  try {
    // Get project ID for Panavid Fixed Cost Projects
    const projectName = 'Panavid Fixed Cost Projects';
    const projectId = await getProjectIdByName(projectName);
    if (!projectId) return res.status(400).json({ error: 'Project not found.' });
    // Fetch the issue to check its project
    const issueUrl = `https://redmine.rolustech.com/issues/${ticket}.json`;
    const issueResp = await axios.get(issueUrl, {
      headers: { 'X-Redmine-API-Key': REDMINE_API_KEY }
    });
    const issue = issueResp.data.issue;
    if (!issue || !issue.project || issue.project.id !== projectId) {
      return res.status(400).json({ error: `Ticket #${ticket} does not belong to project '${projectName}'.` });
    }
    // Log time entry
    const response = await axios.post('https://redmine.rolustech.com/time_entries.json', {
      time_entry: {
        issue_id: ticket,
        hours,
        spent_on: date,
        comments: comment || ''
      }
    }, {
      headers: { 'X-Redmine-API-Key': REDMINE_API_KEY }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.response?.data?.error || error.message });
  }
});

// Ticket details by ID
app.get('/api/tickets/:id', async (req, res) => {
  const ticketId = req.params.id;
  try {
    const url = `https://redmine.rolustech.com/issues/${ticketId}.json`;
    const response = await axios.get(url, {
      headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
    });
    res.json(response.data.issue || {});
  } catch (error) {
    res.status(404).json({ error: 'Ticket not found.' });
  }
});

// Get all time logs for a ticket
app.get('/api/ticket-timelogs/:id', async (req, res) => {
  const ticketId = req.params.id;
  try {
    const url = `https://redmine.rolustech.com/time_entries.json?issue_id=${ticketId}`;
    const response = await axios.get(url, {
      headers: { 'X-Redmine-API-Key': REDMINE_API_KEY },
    });
    res.json(response.data.time_entries || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
}); 