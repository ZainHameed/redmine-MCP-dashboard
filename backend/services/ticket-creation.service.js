/**
 * Ticket Creation Service
 * Handles hierarchical ticket creation in Redmine
 */

const redmineService = require('./redmine.service');

/**
 * Count total nodes in tree (for progress tracking)
 */
const countTotalNodes = (tree) => {
  let count = 0;
  const countNode = (node) => {
    count++;
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => countNode(child));
    }
  };
  tree.forEach(rootNode => countNode(rootNode));
  return count;
};

/**
 * Create tickets from tree structure
 * @param {Array<Object>} tree - Array of root TicketNode objects
 * @param {number} projectId - Redmine project ID
 * @param {Function} [progressCallback] - Optional callback for progress updates (current, total)
 * @returns {Promise<Array<Object>>} Array of creation results
 */
const createTicketsFromTree = async (tree, projectId, progressCallback = null) => {
  const results = [];
  const totalNodes = countTotalNodes(tree);
  let currentCount = 0;
  
  const updateProgress = () => {
    currentCount++;
    if (progressCallback) {
      progressCallback(currentCount, totalNodes);
    }
  };
  
  for (const rootNode of tree) {
    await createNodeRecursive(rootNode, projectId, null, results, updateProgress);
  }
  
  return results;
};

/**
 * Recursively create a node and its children
 * @param {Object} node - TicketNode to create
 * @param {number} projectId - Redmine project ID
 * @param {number|null} parentId - Parent issue ID (null for root)
 * @param {Array<Object>} results - Results array to append to
 * @param {Function} updateProgress - Progress update callback
 */
const createNodeRecursive = async (node, projectId, parentId, results, updateProgress) => {
  try {
    // Skip virtual story nodes (they reference existing Redmine stories)
    if (node.tempId && node.tempId.startsWith('story-') && node.data.user_story_id) {
      // This is a virtual story node - use the existing Redmine story ID
      const storyId = node.data.user_story_id;
      
      // Record that we're using existing story
      results.push({
        tempId: node.tempId,
        redmineId: storyId,
        success: true,
        error: null,
        isExistingStory: true
      });
      updateProgress();
      
      // Create children under this existing story
      for (const child of node.children) {
        await createNodeRecursive(child, projectId, storyId, results, updateProgress);
      }
      return;
    }
    
    // Prepare issue data
    const issueData = {
      project_id: projectId,
      subject: node.data.subject,
      tracker_id: node.data.tracker_id,
      status_id: node.data.status_id,
      estimated_hours: node.data.estimated_hours || undefined,
      description: node.data.description || undefined
    };
    
    // Add assignee if available
    if (node.data.assignee_id) {
      issueData.assigned_to_id = node.data.assignee_id;
    }
    
    // Add parent if this is a child
    if (parentId) {
      issueData.parent_issue_id = parentId;
    }
    
    // Create the issue
    const createdIssue = await redmineService.createIssue(issueData);
    
    // Record success
    results.push({
      tempId: node.tempId,
      redmineId: createdIssue.id,
      success: true,
      error: null
    });
    updateProgress();
    
    // Create children recursively
    for (const child of node.children) {
      await createNodeRecursive(child, projectId, createdIssue.id, results, updateProgress);
    }
    
  } catch (error) {
    // Record failure
    results.push({
      tempId: node.tempId,
      redmineId: null,
      success: false,
      error: error.message || 'Unknown error'
    });
    updateProgress();
    
    // Still try to create children (they might succeed even if parent failed)
    for (const child of node.children) {
      await createNodeRecursive(child, projectId, null, results, updateProgress);
    }
  }
};

module.exports = {
  createTicketsFromTree
};
