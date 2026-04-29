# Bulk Ticket Creator Feature

## Overview

The Bulk Ticket Creator is a feature that allows users to upload CSV files exported from Google Sheets, map columns to Redmine fields, preview tickets in a hierarchical tree structure, and create multiple tickets in Redmine at once.

## Architecture

This feature follows the **Adapter Pattern** to decouple data source parsing from core business logic:

- **Current Implementation**: CSV file upload
- **Future Implementation**: Direct Google Sheets API integration
- **Benefit**: Core logic (tree building, user matching, ticket creation) remains unchanged when switching data sources

## Features

1. **CSV Upload & Column Mapping**: Upload CSV files and map columns to Redmine fields
2. **Hierarchical Tree Preview**: Visualize tickets as a tree (Story → Task → Subtask)
3. **Editable Preview**: Edit estimated hours and assignees before creation
4. **Bulk Creation**: Create all tickets in Redmine with proper parent-child relationships
5. **Results Export**: Download CSV with original data + Redmine ticket IDs

## User Guide

### Step 1: Prepare Your CSV File

Export your data from Google Sheets as CSV. Your CSV should include columns like:

- **Task**: The main task/subject (required if no Subject column)
- **Sub-task**: Subtasks that belong to a Task (optional)
- **Subject/Title**: The ticket title (required if no Task column, or can be same as Task)
- **Assignee**: Optional - Name of the person assigned (will be matched to Redmine users)
- **Estimated Hours** / **Effort (hrs)**: Optional - Time estimate
- **Description**: Optional - Ticket description

**Important Notes:**
- **User Stories** are created manually by leads in Redmine. You can select an existing user story from the dropdown to link all tickets under it.
- If a row has both **Task** and **Sub-task** values, the Sub-task will be created as a child of that Task.
- If a row has only **Sub-task** (Task is empty), it will be linked to the previous Task in the CSV.
- **Assignee names** from CSV are matched to Redmine users. If no match is found, the assignee will be empty and highlighted in red for you to fix in Step 2.

**Example CSV Structure:**
```csv
Task,Sub-task,Description,Assignee,Effort (hrs)
"[FE] Create route","[FE] Create /billing-crewing route","Add Angular route","Akasha",1
,"[FE] Scaffold Component","Generate container component","Akasha",2
"[FE] State Management","[FE] Implement state models","Define TypeScript interfaces","Abubakar",5
```

### Step 2: Access the Feature

1. Open the Redmine Dashboard
2. Click on the **"Bulk Ticket Creator"** tab (third tab with add_task icon)
3. You'll see a 3-step wizard

### Step 3: Upload & Map Columns

1. **Upload CSV File**:
   - Click "Choose CSV File"
   - Select your exported CSV file

2. **Map Columns**:
   - The system will auto-detect common column names
   - Manually map CSV columns to Redmine fields:
     - **Subject** (Optional if Task is mapped): Map to your title/subject column, or leave empty if using Task column
     - **Task** (Required if Subject not mapped): Map to your task column - this becomes the ticket subject
     - **Subtask**: Map to subtask column - these become children of Tasks
     - **Assignee**: Map to assignee/owner column
     - **Estimated Hours**: Map to hours/time column (e.g., "Effort (hrs)")
     - **Description**: Map to description/notes column

3. **Select Project**:
   - Choose the target Redmine project (AI Training or Panavid)
   - Default: AI Training (for testing)
   - User stories for the selected project will load automatically

4. **Select User Story (Optional)**:
   - If you want to link all tickets under an existing user story, select it from the dropdown
   - Leave empty to create standalone tickets (no parent user story)
   - User stories are created manually by leads, so you select from existing ones

5. **Click "Next"** to proceed to preview

### Step 4: Preview & Polish

The system will:
- Parse your CSV
- Build a hierarchical tree structure
- Match assignee names to Redmine users
- Display tickets in a tree table

**What you can do:**

1. **Review the Tree Structure**:
   - Stories appear at the root level
   - Tasks appear under stories
   - Subtasks appear under tasks

2. **Edit Estimated Hours**:
   - Click on any estimated hours cell
   - Enter or modify the value
   - Must be a positive number

3. **Fix Assignees**:
   - If an assignee wasn't matched (shown in red), select from the dropdown
   - Dropdown shows all Redmine users
   - Invalid assignees are highlighted in red

4. **Validation**:
   - All tickets must have:
     - Valid subject (not empty)
     - Valid estimated hours (number ≥ 0)
     - Valid assignee (matched Redmine user)
   - Invalid rows are highlighted in red

5. **Click "Create Tickets"** when ready

### Step 5: Execute & Results

1. **Progress Indicator**:
   - Shows "Creating tickets..." while processing
   - Tickets are created in order: parent first, then children

2. **Results Summary**:
   - **Total**: Number of tickets processed
   - **Succeeded**: Successfully created tickets
   - **Failed**: Tickets that failed (with error messages)

3. **Download Results**:
   - Click "Download Results CSV"
   - Contains original data + Redmine ticket IDs
   - Use this to track which CSV rows became which Redmine tickets

## Technical Details

### Backend Endpoints

1. **POST `/api/bulk-tickets/preview`**
   - Accepts: CSV file + ColumnMapping JSON
   - Returns: `TicketNode[]` tree structure
   - Purpose: Parse CSV and build preview tree

2. **GET `/api/bulk-tickets/users`**
   - Returns: `{id, name}[]` list of Redmine users
   - Purpose: Populate assignee dropdowns

3. **POST `/api/bulk-tickets/execute`**
   - Accepts: `TicketNode[]` tree + projectId
   - Returns: Creation results with Redmine IDs
   - Purpose: Create tickets in Redmine

### Data Flow

```
CSV File
  ↓
CSV Adapter (parseCSV)
  ↓
Flat Array of Rows
  ↓
Normalizer Service (buildTicketTree)
  ↓
Hierarchical Tree (TicketNode[])
  ↓
Frontend Preview & Edit
  ↓
Ticket Creation Service (createTicketsFromTree)
  ↓
Redmine API (createIssue)
  ↓
Results with Redmine IDs
```

### Hierarchy Logic

The system infers hierarchy from column values:

1. **If User Story is selected from dropdown** → All tickets become children of that story
2. **If Task column has value** → Level: **Task**
   - If the same row also has Sub-task value → Creates Task with Subtask as child
   - If only Task has value → Creates standalone Task
3. **If only Sub-task column has value** (Task is empty) → Level: **Subtask**
   - Links to the most recently created Task (from previous row)
   - If no previous Task exists, becomes orphan root

**Parent-Child Relationships:**
- If User Story selected: Story → Tasks → Subtasks
- If no User Story: Tasks (root) → Subtasks
- Subtasks without a Task in the same row link to the previous Task in CSV

### User Matching

The system attempts to match assignee names from CSV to Redmine users:

1. **Exact Match**: Case-insensitive exact name match
2. **Partial Match**: Name contains or is contained in user name
3. **First/Last Name Match**: Matches any part of the name
4. **Fallback**: If no match, `assignee_id` is set to `null` and flagged for user correction

### Tracker Mapping

Trackers are auto-detected from Redmine API:

- **Story Level** → Matches trackers: "Story", "User Story", "Epic"
- **Task Level** → Matches trackers: "Task", "Feature"
- **Subtask Level** → Matches trackers: "Subtask", "Sub-task", "Sub Task"
- **Fallback**: Uses first available tracker if no match found

### Status

All tickets are created with **"New"** status (auto-detected from Redmine API, typically status_id = 1).

## Project Configuration

### Available Projects

- **AI Training** (ID: 1586) - For testing new features
- **Panavid Fixed Cost Projects** (ID: 944) - Production project

### Switching Projects

The project selector in Step 1 allows you to choose which Redmine project to create tickets in. Default is AI Training for testing purposes.

## Error Handling

### Common Issues

1. **"Subject mapping is required"**
   - Solution: Map at least the Subject column in Step 1

2. **"Some tickets have invalid data"**
   - Solution: Fix highlighted rows in Step 2:
     - Ensure all assignees are selected from dropdown
     - Ensure estimated hours are valid numbers

3. **"Project ID is required"**
   - Solution: Select a project in Step 1

4. **"Failed to create tickets"**
   - Check backend logs for details
   - Verify Redmine API key has permissions
   - Ensure project exists and is accessible

### Validation Rules

- **Required**: Subject, Project ID
- **Optional but Validated**: Assignee (must match Redmine user), Estimated Hours (must be numeric ≥ 0)
- **Hierarchy**: At least one root node (Story) recommended

## Future Enhancements

1. **Google Sheets Direct Integration**: Replace CSV adapter with Google Sheets API adapter
2. **Batch Size Control**: Allow users to create tickets in smaller batches
3. **Template Support**: Save and reuse column mappings
4. **Preview Before Upload**: Show CSV preview before mapping
5. **Bulk Edit**: Edit multiple tickets at once in preview
6. **Rollback**: Delete created tickets if something goes wrong

## Troubleshooting

### Tickets Not Appearing in Redmine

1. Check execution results for errors
2. Verify project ID is correct
3. Check Redmine API permissions
4. Review backend logs: `backend/logs/` or console output

### Assignees Not Matching

1. **Common Issue**: CSV has first name only (e.g., "Akasha") but Redmine has full name (e.g., "Akasha Khan")
2. **Solution**: In Step 2 (Preview), use the dropdown to manually select the correct user
3. Unmatched assignees are highlighted in red - you must fix them before creating tickets
4. The system tries fuzzy matching but may not always find partial matches

### Tree Structure Incorrect

1. **Task/Subtask Relationship**:
   - If a row has both Task and Sub-task → Sub-task becomes child of that Task
   - If a row has only Sub-task (Task empty) → Links to previous Task in CSV
   - Ensure Tasks appear before their Subtasks in CSV

2. **User Story Linking**:
   - If you selected a user story, all tickets should appear under it
   - If no user story selected, tickets are created as standalone (no parent)

3. **Empty Rows**: Rows with both Task and Sub-task empty are skipped

### Preview Not Loading

1. Check that at least Subject OR Task column is mapped
2. Verify CSV file is valid (not corrupted)
3. Check browser console for errors
4. Verify backend server is running on port 3000

## Support

For issues or questions:
1. Check backend logs: `backend/logs/`
2. Check browser console for frontend errors
3. Verify Redmine API connectivity
4. Test with a small CSV file first

## Example Workflow (TBD Format)

Based on the actual TBD CSV structure:

1. **Prepare CSV** in Google Sheets with columns:
   - **Task**: Main task description (becomes ticket subject)
   - **Sub-task**: Subtask description (becomes child ticket)
   - **Description**: Detailed description
   - **Assignee**: Developer name (e.g., "Akasha", "Abubakar")
   - **Effort (hrs)**: Estimated hours

2. **Export as CSV** from Google Sheets

3. **Navigate** to Bulk Ticket Creator tab (third tab in navigation)

4. **Upload CSV** - Click "Choose CSV File" and select your exported CSV

5. **Map Columns** (auto-mapping should detect common names):
   - **Subject**: Map to "Task" (or leave empty if Task is mapped separately)
   - **Task**: Map to "Task" column
   - **Subtask**: Map to "Sub-task" column
   - **Assignee**: Map to "Assignee" column
   - **Estimated Hours**: Map to "Effort (hrs)" column
   - **Description**: Map to "Description" column

6. **Select Project**: Choose "AI Training" (for testing) or "Panavid" (production)

7. **Select User Story (Optional)**: 
   - Dropdown will show all user stories from the selected project
   - Select one to link all tickets under it
   - Leave empty for standalone tickets

8. **Click "Next"** to generate preview

9. **Review Preview** (Step 2):
   - Check tree structure: Tasks with Subtasks as children
   - Fix any unmatched assignees (highlighted in red) by selecting from dropdown
   - Edit estimated hours if needed
   - Ensure all tickets have valid assignees before proceeding

10. **Click "Create Tickets"** - wait for processing

11. **Download Results** - save the CSV with Redmine IDs for reference

12. **Verify in Redmine** - check that tickets were created correctly under the selected user story (if any)

---

**Note**: Always test with the AI Training project first before using in production (Panavid project).
