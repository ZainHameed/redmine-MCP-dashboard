/**
 * Ticket Normalizer Service
 * Converts flat CSV rows into hierarchical tree structure
 * Core logic is decoupled from CSV parsing (Adapter Pattern)
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Build ticket tree from flat rows
 * @param {Array<Object>} rows - Flat array of CSV rows
 * @param {Object} columnMapping - Column mapping configuration
 * @param {Array<Object>} redmineUsers - Array of Redmine users for matching
 * @param {Object} trackerMapping - Mapping of level to tracker ID
 * @param {number} statusId - Status ID for "New" status
 * @param {number|null} selectedUserStoryId - Selected user story ID (from dropdown, optional)
 * @returns {Array<Object>} Array of root TicketNode objects
 */
const buildTicketTree = (rows, columnMapping, redmineUsers, trackerMapping, statusId, selectedUserStoryId = null) => {
  const tree = [];
  const taskMap = new Map(); // Map of task identifier -> TicketNode
  let lastTaskNode = null; // Track the most recently created task for orphan subtasks
  
  // If user story is selected, create a virtual story node
  let virtualStoryNode = null;
  if (selectedUserStoryId) {
    virtualStoryNode = {
      tempId: `story-${selectedUserStoryId}`,
      level: 'Story',
      data: {
        subject: `User Story #${selectedUserStoryId}`,
        assignee_id: null,
        original_assignee_name: '',
        estimated_hours: 0,
        tracker_id: trackerMapping.story || trackerMapping.task,
        description: '',
        status_id: statusId,
        user_story_id: selectedUserStoryId // Store the actual Redmine story ID
      },
      children: [],
      isValid: true
    };
    tree.push(virtualStoryNode);
  }
  
  for (const row of rows) {
    const taskValue = getValue(row, columnMapping.task);
    const subtaskValue = getValue(row, columnMapping.subtask);
    
    // Skip empty rows
    if (!taskValue && !subtaskValue) {
      continue;
    }
    
    if (taskValue) {
      // Row has a Task value
      // Create task node
      const taskHierarchy = { level: 'Task', identifier: taskValue };
      const taskNode = createNode(row, columnMapping, taskHierarchy, redmineUsers, trackerMapping, statusId);
      taskMap.set(taskValue, taskNode);
      lastTaskNode = taskNode; // Update last task
      
      // Add task to parent (story if selected, or root)
      if (virtualStoryNode) {
        virtualStoryNode.children.push(taskNode);
      } else {
        tree.push(taskNode);
      }
      
      // If this row also has a subtask, create it as child of this task
      if (subtaskValue) {
        const subtaskNode = createSubtaskNode(row, columnMapping, redmineUsers, trackerMapping, statusId, subtaskValue);
        taskNode.children.push(subtaskNode);
      }
    } else if (subtaskValue) {
      // Row has only Subtask (no Task)
      // Link to the last created task, or create as orphan
      const subtaskHierarchy = { level: 'Subtask', identifier: subtaskValue };
      const subtaskNode = createNode(row, columnMapping, subtaskHierarchy, redmineUsers, trackerMapping, statusId);
      
      if (lastTaskNode) {
        // Link to last task
        lastTaskNode.children.push(subtaskNode);
      } else {
        // Orphan subtask - add to story or root
        if (virtualStoryNode) {
          virtualStoryNode.children.push(subtaskNode);
        } else {
          tree.push(subtaskNode);
        }
      }
    }
  }
  
  // Validate all nodes
  validateTree(tree);
  
  return tree;
};

/**
 * Infer hierarchy level from row data
 * Priority: Task > Subtask (if both exist, Task is parent, Subtask is child)
 * @param {Object} row - CSV row
 * @param {Object} columnMapping - Column mapping
 * @returns {Object|null} {level: string, identifier: string} or null
 */
const inferHierarchy = (row, columnMapping) => {
  const task = columnMapping.task ? (row[columnMapping.task] || '').trim() : '';
  const subtask = columnMapping.subtask ? (row[columnMapping.subtask] || '').trim() : '';
  
  // If Task exists, it's a Task (even if Subtask also exists - Subtask will be handled separately)
  if (task) {
    return { level: 'Task', identifier: task };
  } 
  // If only Subtask exists, it's a Subtask
  else if (subtask) {
    return { level: 'Subtask', identifier: subtask };
  }
  
  // Fallback: if subject exists, treat as Task
  const subject = columnMapping.subject ? (row[columnMapping.subject] || '').trim() : '';
  if (subject) {
    return { level: 'Task', identifier: subject };
  }
  
  return null;
};

/**
 * Get story identifier from row
 */
const getStoryIdentifier = (row, columnMapping) => {
  return columnMapping.userStory ? (row[columnMapping.userStory] || '').trim() : '';
};

/**
 * Get task identifier from row
 */
const getTaskIdentifier = (row, columnMapping) => {
  return columnMapping.task ? (row[columnMapping.task] || '').trim() : '';
};

/**
 * Find node by identifier in tree
 */
const findNodeByIdentifier = (tree, identifier, level) => {
  for (const node of tree) {
    if (node.level === level && node.data.subject === identifier) {
      return node;
    }
    const found = findNodeByIdentifier(node.children, identifier, level);
    if (found) return found;
  }
  return null;
};

/**
 * Create a TicketNode from row data
 */
const createNode = (row, columnMapping, hierarchy, redmineUsers, trackerMapping, statusId) => {
  // Determine subject based on hierarchy level and column mapping
  let subject;
  if (hierarchy.level === 'Task') {
    // For Task: use Task column value, or subject mapping, or identifier
    subject = getValue(row, columnMapping.task) || 
              getValue(row, columnMapping.subject) || 
              hierarchy.identifier || 
              'Untitled';
  } else if (hierarchy.level === 'Subtask') {
    // For Subtask: use Subtask column value, or subject mapping, or identifier
    subject = getValue(row, columnMapping.subtask) || 
              getValue(row, columnMapping.subject) || 
              hierarchy.identifier || 
              'Untitled';
  } else {
    // For Story or other: use subject mapping or identifier
    subject = getValue(row, columnMapping.subject) || hierarchy.identifier || 'Untitled';
  }
  
  const assigneeName = getValue(row, columnMapping.assignee) || '';
  const estimatedHours = parseFloat(getValue(row, columnMapping.estimatedHours) || '0') || 0;
  const description = getValue(row, columnMapping.description) || '';
  
  const assigneeMatch = matchUserByName(assigneeName, redmineUsers);
  
  const trackerId = trackerMapping[hierarchy.level.toLowerCase()] || trackerMapping.task;
  
  const node = {
    tempId: uuidv4(),
    level: hierarchy.level,
    data: {
      subject,
      assignee_id: assigneeMatch ? assigneeMatch.id : null,
      original_assignee_name: assigneeName,
      estimated_hours: estimatedHours,
      tracker_id: trackerId,
      description,
      status_id: statusId
    },
    children: [],
    isValid: validateNodeData(subject, assigneeMatch, estimatedHours)
  };
  
  return node;
};

/**
 * Create a Subtask node from row data (when Task and Subtask are in same row)
 */
const createSubtaskNode = (row, columnMapping, redmineUsers, trackerMapping, statusId, subtaskValue) => {
  const subject = subtaskValue || getValue(row, columnMapping.subject) || 'Untitled';
  const assigneeName = getValue(row, columnMapping.assignee) || '';
  const estimatedHours = parseFloat(getValue(row, columnMapping.estimatedHours) || '0') || 0;
  const description = getValue(row, columnMapping.description) || '';
  
  const assigneeMatch = matchUserByName(assigneeName, redmineUsers);
  
  const trackerId = trackerMapping.subtask || trackerMapping.task;
  
  return {
    tempId: uuidv4(),
    level: 'Subtask',
    data: {
      subject,
      assignee_id: assigneeMatch ? assigneeMatch.id : null,
      original_assignee_name: assigneeName,
      estimated_hours: estimatedHours,
      tracker_id: trackerId,
      description,
      status_id: statusId
    },
    children: [],
    isValid: validateNodeData(subject, assigneeMatch, estimatedHours)
  };
};

/**
 * Get value from row by column mapping
 */
const getValue = (row, columnName) => {
  if (!columnName) return '';
  return (row[columnName] || '').trim();
};

/**
 * Match user by name (fuzzy matching)
 * @param {string} name - Name to match
 * @param {Array<Object>} redmineUsers - Array of Redmine users
 * @returns {Object|null} Matched user or null
 */
const matchUserByName = (name, redmineUsers) => {
  if (!name || !redmineUsers || redmineUsers.length === 0) {
    return null;
  }
  
  const normalizedName = name.toLowerCase().trim();
  
  // Exact match (full name)
  let match = redmineUsers.find(user => 
    user.name.toLowerCase().trim() === normalizedName
  );
  
  if (match) {
    console.log(`Exact match: "${name}" -> "${match.name}" (id: ${match.id})`);
    return match;
  }
  
  // Check if the search name is contained in user name (e.g., "Muiz" in "Muiz Ather")
  match = redmineUsers.find(user => {
    const userName = user.name.toLowerCase().trim();
    // Check if search name appears as a word in user name
    // Use word boundaries to avoid partial matches within words
    const escapedName = normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(`\\b${escapedName}\\b`, 'i');
    if (searchRegex.test(userName)) {
      return true;
    }
    // Also check if search name is at the start of user name (first name match)
    if (userName.startsWith(normalizedName + ' ')) {
      return true;
    }
    // Check if search name is at the end (last name match)
    if (userName.endsWith(' ' + normalizedName) || userName === normalizedName) {
      return true;
    }
    return false;
  });
  
  if (match) {
    console.log(`Word boundary match: "${name}" -> "${match.name}" (id: ${match.id})`);
    return match;
  }
  
  // Check if any word in user name matches the search name (e.g., "Rauf" in "Abdul Rauf")
  const nameParts = normalizedName.split(/\s+/).filter(p => p.length > 0);
  if (nameParts.length > 0) {
    match = redmineUsers.find(user => {
      const userName = user.name.toLowerCase().trim();
      const userParts = userName.split(/\s+/).filter(p => p.length > 0);
      
      // Check if any part of the search name exactly matches any part of the user name
      // This handles cases like "Rauf" matching "Abdul Rauf"
      return nameParts.some(part => 
        userParts.some(userPart => userPart === part)
      );
    });
  }
  
  if (match) {
    console.log(`Word part match: "${name}" -> "${match.name}" (id: ${match.id})`);
    return match;
  }
  
  // Fallback: Check if search name starts with any user name part or vice versa
  if (nameParts.length > 0) {
    match = redmineUsers.find(user => {
      const userName = user.name.toLowerCase().trim();
      const userParts = userName.split(/\s+/).filter(p => p.length > 0);
      
      return nameParts.some(part => 
        userParts.some(userPart => 
          userPart.startsWith(part) || part.startsWith(userPart)
        )
      );
    });
  }
  
  if (match) {
    console.log(`Prefix/suffix match: "${name}" -> "${match.name}" (id: ${match.id})`);
    return match;
  }
  
  console.log(`No match found for: "${name}"`);
  return null;
};

/**
 * Validate node data
 */
const validateNodeData = (subject, assigneeMatch, estimatedHours) => {
  if (!subject || subject.trim() === '') {
    return false;
  }
  
  if (isNaN(estimatedHours) || estimatedHours < 0) {
    return false;
  }
  
  return true;
};

/**
 * Validate entire tree
 */
const validateTree = (tree) => {
  const validateNode = (node) => {
    // Re-validate node
    node.isValid = validateNodeData(
      node.data.subject,
      node.data.assignee_id ? { id: node.data.assignee_id } : null,
      node.data.estimated_hours
    );
    
    // Validate children
    node.children.forEach(validateNode);
  };
  
  tree.forEach(validateNode);
};

module.exports = {
  buildTicketTree,
  matchUserByName,
  inferHierarchy
};
