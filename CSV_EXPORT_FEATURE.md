# CSV Export Feature Documentation

## Overview

The CSV Export feature allows users to export productivity data for multiple users within a selected timeframe. The exported CSV file contains detailed time logs, individual user summaries, and an overall summary for all selected users.

## Features

### 1. Multi-User Selection
- Select one or more users from the "Users (Export)" dropdown
- Users are filtered based on the selected projects
- Supports alphabetically sorted user list

### 2. Date Range Selection
- Export data for:
  - This Week
  - Last Week
  - This Month
  - Last Month

### 3. Project Filtering
- Select one or more projects to filter data
- Only users belonging to selected projects are shown

## CSV File Structure

### Header Section
```csv
Productivity Report - [Date Range]
Generated: [ISO Timestamp]
```

### Main Data Table (Flat Structure)
A single, easy-to-read table containing all tickets from all selected users:

```csv
User,Issue,Calculated Time (h),Time Spent (h),Productivity (%),Remaining Time (h)
[User Name],[Status] #[Ticket ID]: [Subject],[Calculated Time],[Time Spent],[Productivity],[Remaining Time]
...
```

**Column Descriptions:**
- **User**: Full name of the user
- **Issue**: Ticket status, ID, and subject (e.g., "New #123596: Meetings")
- **Calculated Time (h)**: Hours calculated based on productivity rules
- **Time Spent (h)**: Actual hours logged by the user
- **Productivity (%)**: Percentage of productivity (0-100+)
- **Remaining Time (h)**: Remaining estimated time for closed tickets (if applicable)

### Summary Section
```csv
OVERALL SUMMARY (All Selected Users)

User Name,Calculated Time (h),Time Spent (h),Productivity (%)
[User 1 Name],[User 1 Calculated],[User 1 Spent],[User 1 Productivity]
[User 2 Name],[User 2 Calculated],[User 2 Spent],[User 2 Productivity]
...

GRAND TOTALS
Total Users,Total Calculated Time (h),Total Time Spent (h),Average Productivity (%)
[User Count],[Grand Total Calculated],[Grand Total Spent],[Grand Average Productivity]
```

## Example CSV Output

```csv
Productivity Report - 2025-09-01 to 2025-09-30
Generated: 2025-10-07T14:07:05.461Z

User,Issue,Calculated Time (h),Time Spent (h),Productivity (%),Remaining Time (h)
Faizan Atif,New #123596: Meetings,0.00,5.00,0,0
Faizan Atif,New #123643: Daily Scrum,0.00,9.00,0,0
Faizan Atif,In Progress #155517: TBD & Analysis - Recursive Approval Process,14.00,14.00,100,0
Faizan Atif,Closed #155858: Project Management,1.00,1.00,100,2.00
Faizan Atif,Code Review #156307: Single Range Availability API,20.00,23.50,85,0
Faizan Atif,New #156406: Approvals from Template Creation Mechanism,23.50,23.50,100,0
Akasha Shahid,New #123596: Meetings,0.00,4.00,0,0
Akasha Shahid,New #123643: Daily Scrum,0.00,10.50,0,0
Akasha Shahid,Closed #155011: Display the quote stage in read-only mode for all truck types,22.00,22.00,100,0
Akasha Shahid,Closed #155858: Project Management,9.00,9.00,100,2.00
Akasha Shahid,New #156022: TBD Upgrade from 14 to 20,42.00,42.00,100,0
OVERALL SUMMARY (All Selected Users)

User Name,Calculated Time (h),Time Spent (h),Productivity (%)
Faizan Atif,104.00,130.00,80.00
Akasha Shahid,139.50,165.00,84.55

GRAND TOTALS
Total Users,Total Calculated Time (h),Total Time Spent (h),Average Productivity (%)
2,243.50,295.00,82.54
```

## How to Use

### Frontend UI

1. **Select Projects**: Choose one or more projects from the "Projects" dropdown
2. **Select Users for Export**: Choose one or more users from the "Users (Export)" dropdown
3. **Select Date Range**: Choose the desired time period from the "Date Range" dropdown
4. **Click Export**: Click the "Export CSV" button to download the file

The export button will:
- Show a loading spinner while generating the CSV
- Download the file automatically with a descriptive filename: `productivity_report_[from_date]_to_[to_date].csv`

### API Endpoint

**Endpoint**: `GET /api/productivity/export`

**Query Parameters**:
- `user_ids` (required): Comma-separated list of user IDs (e.g., `1126,975,1003`)
- `project_ids` (optional): Comma-separated list of project IDs (e.g., `944`)
- `from_date` (optional): Start date in YYYY-MM-DD format (e.g., `2025-09-01`)
- `to_date` (optional): End date in YYYY-MM-DD format (e.g., `2025-09-30`)

**Example cURL Command**:
```bash
curl "http://localhost:3000/api/productivity/export?user_ids=1126,975&project_ids=944&from_date=2025-09-01&to_date=2025-09-30" -o productivity_report.csv
```

## Data Calculations

### Individual Ticket Calculations
- **Calculated Time**: Based on the productivity calculation rules (see `PRODUCTIVITY_CALCULATION_EXPLAINED.md`)
- **Time Spent**: Actual hours logged by the user on the ticket
- **Productivity**: Percentage based on calculated time vs. time spent
- **Remaining Time**: For closed tickets, shows remaining estimated time if applicable
- **Time Log Details**: List of all dates and hours logged by the user

### User Summary
- **Total Calculated Time**: Sum of all calculated times for the user
- **Total Time Spent**: Sum of all time spent by the user
- **Average Productivity**: `(Total Calculated Time / Total Time Spent) × 100`

### Overall Summary
- **Total Users**: Count of selected users
- **Total Calculated Time**: Sum of all users' calculated times
- **Total Time Spent**: Sum of all users' time spent
- **Average Productivity**: `(Total Calculated Time / Total Time Spent) × 100`

## CSV Formatting Features

### Proper Escaping
- Values containing commas, quotes, or newlines are properly escaped
- Quotes within values are doubled (`""`)
- Complex values are wrapped in quotes

### Visual Appeal
- Clear section headers (USER, USER SUMMARY, OVERALL SUMMARY)
- Consistent column ordering
- Easy-to-read date and time formats
- Blank lines separating sections for readability

## Technical Implementation

### Backend (`backend/index.js`)
- New endpoint: `/api/productivity/export`
- Fetches productivity data for multiple users in a single request
- Uses the same `calculateNewProductivity` function for consistency
- Generates CSV content with proper escaping
- Returns CSV as a downloadable file

### Frontend (`frontend/src/app/tabs/productivity-tab/`)
- New "Users (Export)" multi-select dropdown
- "Export CSV" button with loading state
- Client-side CSV download using temporary `<a>` element
- Uses relative API path for proxy compatibility

## Benefits

1. **Multi-User Comparison**: Export data for multiple team members at once
2. **Comprehensive Details**: Includes all ticket details and time log information
3. **Ready for Analysis**: CSV format is compatible with Excel, Google Sheets, and data analysis tools
4. **Consistent Calculations**: Uses the same productivity calculation logic as the dashboard
5. **Flexible Date Ranges**: Support for weekly and monthly reporting periods
6. **Professional Formatting**: Well-structured and easy to read in spreadsheet applications

## Future Enhancements

Potential improvements for future versions:
- Custom date range selection (start/end date pickers)
- Additional export formats (Excel, PDF)
- Scheduled/automated exports
- Email delivery of reports
- Custom column selection
- Chart/graph generation

