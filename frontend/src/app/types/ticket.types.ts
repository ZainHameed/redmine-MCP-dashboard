/**
 * Type Definitions for Bulk Ticket Creator
 * TypeScript interfaces matching backend types
 */

export interface TicketNode {
  tempId: string;
  level: 'Story' | 'Task' | 'Subtask';
  data: TicketNodeData;
  children: TicketNode[];
  isValid: boolean;
}

export interface TicketNodeData {
  subject: string;
  assignee_id: number | null;
  original_assignee_name: string;
  estimated_hours: number;
  tracker_id: number;
  description: string;
  status_id: number;
}

export interface ColumnMapping {
  subject?: string;
  assignee?: string;
  estimatedHours?: string;
  description?: string;
  userStory?: string;
  task?: string;
  subtask?: string;
}

export interface RedmineUser {
  id: number;
  name: string;
  login?: string;
}

export interface TicketCreationResult {
  tempId: string;
  redmineId: number | null;
  success: boolean;
  error: string | null;
  isExistingStory?: boolean; // Optional flag for virtual story nodes
}

export interface TicketCreationResponse {
  success: boolean;
  results: TicketCreationResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}
