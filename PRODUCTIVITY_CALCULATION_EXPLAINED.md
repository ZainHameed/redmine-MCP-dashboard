# Productivity Calculation Documentation

## Overview
This document explains how productivity, calculated time, and remaining time are computed in the Redmine MCP Dashboard.

## Key Concepts

### 1. Calculated Time
**Calculated Time** is NOT the same as the estimated time from the ticket. It represents the time that should be counted for productivity calculation based on various business rules.

### 2. Time Spent
**Time Spent** is the actual time the user logged on the ticket during the selected date range.

### 3. Productivity
**Productivity** = (Calculated Time / Time Spent) × 100%

This shows how efficiently the user worked compared to what should have been done.

### 4. Remaining Time
**Remaining Time** applies only to "Project Management" and "Deployment" tickets that are closed with multiple users logging time. It shows how much of the estimated time is still unaccounted for.

---

## Calculation Rules

### Rule 1: N/A Estimated Time (No TBD)
- **When**: Ticket has NO estimated time AND does NOT contain "TBD" in the name
- **Calculated Time**: 0
- **Productivity**: 0%
- **Example**: "Meetings" ticket with no estimate → 0/10h = 0%

### Rule 2: N/A Estimated Time + TBD
- **When**: Ticket has NO estimated time BUT contains "TBD" in the name
- **Calculated Time**: Time Spent (n)
- **Productivity**: n/n = 100%
- **Reason**: TBD tasks are exploratory/research tasks where time cannot be pre-estimated
- **Example**: "TBD Analysis & Research" with 118h spent → 118h/118h = 100% ✅

### Rule 3: Closed Tickets with Multiple Users
- **When**: 
  - Ticket status is "Closed"
  - Multiple users have logged time on the ticket
  - Ticket HAS estimated time
- **Calculated Time**: User's logged time (n)
- **Productivity**: n/n = 100%
- **Remaining Time** (for PM/Deployment only): Estimated Time - Total Time by All Users

**Example**:
- Ticket estimated: 16h
- User A logged: 8h
- User B logged: 3.5h
- Total logged: 11.5h
- For User B: Calculated Time = 3.5h, Productivity = 3.5/3.5 = 100%
- If it's a "Project Management" ticket: Remaining Time = 16 - 11.5 = 4.5h

**Rationale**: When multiple users work on a closed ticket, each user's contribution is considered 100% productive as the work was completed and accepted.

### Rule 4: TBD Tickets with Estimated Time
- **When**: Ticket HAS estimated time AND contains "TBD" in the name
- **Calculated Time**: Follows same cumulative tracking as other tickets (Rule 5/6)
- **Productivity**: Calculated using remaining estimated time

**Important**: TBD tickets with estimated time are NOT treated specially. They follow the same rules as regular tickets based on their status.

**Example: Ticket #155517 "TBD & Analysis - Recursive Approval Process" (100h estimated)**

**August**:
- Remaining estimated: 100h - 0h = 100h
- Time spent: 59h
- Calculated time: min(100h, 59h) = 59h
- Productivity: 59h/59h = 100% ✅

**September**:
- Remaining estimated: 100h - 59h = 41h
- Time spent: 14h
- Calculated time: min(41h, 14h) = 14h
- Productivity: 14h/14h = 100% ✅

### Rule 5: New or In Progress Status (Cumulative Tracking)
- **When**: Ticket status is "New" or "In Progress"
- **Calculated Time**: min(Remaining Estimated Time, Time Spent in Current Period)
- **Productivity**: (Calculated Time / Time Spent) × 100%

**Important**: This calculation tracks cumulative progress across months!

**Example: Ticket #155008 (6h estimated)**

**Month 1 (August)**:
- Estimated: 6h
- Time spent before August: 0h
- Remaining estimated: 6h - 0h = 6h
- Time spent in August: 4h
- Calculated Time: min(6h, 4h) = 4h
- Productivity: 4h/4h = 100% ✅

**Month 2 (September) - Scenario A (On Track)**:
- Estimated: 6h
- Time spent before September: 4h
- Remaining estimated: 6h - 4h = 2h
- Time spent in September: 2h
- Calculated Time: min(2h, 2h) = 2h
- Productivity: 2h/2h = 100% ✅

**Month 2 (September) - Scenario B (Exceeded)**:
- Estimated: 6h
- Time spent before September: 4h
- Remaining estimated: 6h - 4h = 2h
- Time spent in September: 3h
- Calculated Time: min(2h, 3h) = 2h
- Productivity: 2h/3h = 66.7% ⚠️

**Rationale**: For in-progress work, we track what was already done in previous periods and only count the remaining estimated time for the current period. This prevents users from being unfairly penalized or rewarded based on work done in previous months.

### Rule 6: All Other Statuses (Cumulative Tracking)
- **When**: Any status except "Closed with multiple users"
- **Applies to**: New, In Progress, Closed (single user), Move to PreProd, Move to Staging, Resolved, Testing, etc.
- **Calculated Time**: min(Remaining Estimated Time, Time Spent in Current Period)
- **Productivity**: (Calculated Time / Time Spent) × 100%

**Important**: Cumulative tracking applies to ALL statuses for consistency!

**Example: Ticket #155008 (Closed) - Already shown in Rule 5**

**Example: Ticket #154172 (Move to PreProd) for Zain**
- Estimated: 25h
- Time spent before September: 0h (assuming first period)
- Remaining estimated: 25h - 0h = 25h
- Time spent in September: 3.25h
- Calculated Time: min(25h, 3.25h) = 3.25h
- Productivity: 3.25h/3.25h = 100% ✅

**Without cumulative tracking, this would have shown**:
- Calculated Time: 25h (full estimated)
- Productivity: 25h/3.25h = 769% ❌ (incorrect)

**Rationale**: Cumulative tracking ensures fair productivity measurement regardless of ticket status, preventing inflated productivity scores when users complete work efficiently.

---

## Average Productivity Calculation

### Formula
**Average Productivity** = (Sum of All Calculated Time / Sum of All Time Spent) × 100%

### Example
| Ticket | Calculated Time | Time Spent | Individual Productivity |
|--------|----------------|------------|------------------------|
| #001   | 0              | 10h        | 0%                     |
| #002   | 3.5            | 3.5h       | 100%                   |
| #003   | 8              | 10h        | 80%                    |
| **Total** | **11.5**    | **23.5h**  | **Avg: 48.9%**         |

**Calculation**: 11.5 / 23.5 × 100% = 48.9%

**Note**: This is NOT the average of individual productivities (0% + 100% + 80%) / 3 = 60%. We calculate based on the total calculated time vs total time spent, which gives a more accurate picture of overall productivity.

---

## Summary Metrics

### 1. Avg Productivity
- Formula: (Total Calculated Time / Total Time Spent) × 100%
- Shows overall efficiency across all tickets

### 2. Total Calculated Time
- Sum of all calculated_time values
- Represents the productive time that should have been achieved

### 3. Total Time Spent
- Sum of all time_spent values
- Represents actual time logged

### 4. Total Tickets
- Count of all tickets in the selected period

---

## Special Cases

### Multi-Month Tracking (New/In Progress/Closed)
When a ticket spans multiple months, the calculation tracks cumulative progress:

**Ticket: 60h estimated**

**Month 1 (August)**: 
- Time spent before: 0h
- Remaining estimated: 60h - 0h = 60h
- Time spent in August: 10h
- Calculated Time: min(60h, 10h) = 10h
- Productivity: 10h/10h = 100% ✅

**Month 2 (September)**: 
- Time spent before: 10h (August)
- Remaining estimated: 60h - 10h = 50h
- Time spent in September: 20h
- Calculated Time: min(50h, 20h) = 20h
- Productivity: 20h/20h = 100% ✅

**Month 3 (October)**: 
- Time spent before: 30h (August + September)
- Remaining estimated: 60h - 30h = 30h
- Time spent in October: 30h
- Calculated Time: min(30h, 30h) = 30h
- Productivity: 30h/30h = 100% ✅

**Month 4 (November)** - Exceeded estimate: 
- Time spent before: 60h (all previous months)
- Remaining estimated: 60h - 60h = 0h
- Time spent in November: 5h
- Calculated Time: min(0h, 5h) = 0h
- Productivity: 0h/5h = 0% ⚠️

**Key Insight**: Once the estimated time is fully consumed in previous periods, any additional time logged shows as 0% productivity, accurately reflecting that the work exceeded the estimate.

### Remaining Time for Closed Tickets
Remaining time is calculated for ALL closed tickets when:
1. Ticket status is "Closed"
2. Ticket has estimated time (not N/A)
3. Total time logged by all users < Estimated time

**Formula**: Remaining Time = Estimated Time - Total Time Logged by All Users

**Purpose**: Helps identify tickets where the work is marked complete but there's still time unaccounted for in the estimate. This is particularly useful for:
- Project Management tasks
- Deployment tasks  
- Any ticket where the team finished early or forgot to log all hours

**Examples**:
- Estimated: 16h, Total logged by all users: 11.5h → Remaining: 4.5h
- Estimated: 4h, Total logged by all users: 3.5h → Remaining: 0.5h
- Estimated: 11h, Total logged by all users: 11h → Remaining: null (fully accounted)

---

## Implementation Notes

- All calculations are performed server-side in the backend API
- The frontend receives calculated_time, productivity, and remaining_time directly
- TBD detection is case-insensitive
- PM/Deployment detection is case-insensitive
- Remaining time is only shown for applicable tickets (others show "-")

---

## Testing

To test these calculations, use:
- **User**: Akasha (ID: 975)
- **Project**: Panavid Fixed Cost Projects (ID: 944)
- Various date ranges to see different scenarios

---

*Last Updated: October 7, 2025*

