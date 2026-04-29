/**
 * Type Definitions for Bulk Ticket Creator
 * Using JSDoc for type documentation (TypeScript-like interfaces)
 */

/**
 * @typedef {Object} TicketNode
 * @property {string} tempId - Unique UUID for UI tracking
 * @property {'Story'|'Task'|'Subtask'} level - Hierarchy level
 * @property {TicketNodeData} data - Ticket data
 * @property {TicketNode[]} children - Child nodes
 * @property {boolean} isValid - Validation status
 */

/**
 * @typedef {Object} TicketNodeData
 * @property {string} subject - Ticket subject/title
 * @property {number|null} assignee_id - Redmine user ID (null if not matched)
 * @property {string} original_assignee_name - Original name from CSV (for UI display)
 * @property {number} estimated_hours - Estimated hours
 * @property {number} tracker_id - Redmine tracker ID
 * @property {string} description - Ticket description
 */

/**
 * @typedef {Object} ColumnMapping
 * @property {string} [subject] - CSV column name for subject
 * @property {string} [assignee] - CSV column name for assignee
 * @property {string} [estimatedHours] - CSV column name for estimated hours
 * @property {string} [description] - CSV column name for description
 * @property {string} [userStory] - CSV column name for user story
 * @property {string} [task] - CSV column name for task
 * @property {string} [subtask] - CSV column name for subtask
 */

/**
 * @typedef {Object} RedmineUser
 * @property {number} id - Redmine user ID
 * @property {string} name - User full name
 * @property {string} [login] - User login name
 */

/**
 * @typedef {Object} TicketCreationResult
 * @property {string} tempId - Original tempId from tree
 * @property {number|null} redmineId - Created Redmine ticket ID (null if failed)
 * @property {boolean} success - Whether creation succeeded
 * @property {string|null} error - Error message if failed
 */

/**
 * @typedef {Object} TrackerMapping
 * @property {number} story - Tracker ID for Story
 * @property {number} task - Tracker ID for Task
 * @property {number} subtask - Tracker ID for Subtask
 */

module.exports = {};
