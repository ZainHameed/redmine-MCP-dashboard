import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { takeUntil, switchMap, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { RedmineService } from '../../redmine.service';
import { WHITELISTED_PROJECTS } from '../../core/constants/projects.constants';
import { getIssueUrl, getTimeEntriesUrl } from '../../core/constants/redmine.constants';

@Component({
  selector: 'app-productivity-tab',
  templateUrl: './productivity-tab.component.html',
  styleUrls: ['./productivity-tab.component.css']
})
export class ProductivityTabComponent implements OnInit, OnDestroy {
  productivityTickets: any[] = [];
  loading = true;
  error = '';
  range = 'this_week';
  
  // Productivity summary properties
  totalProductivity: number = 0;
  averageProductivity: number = 0;
  totalTimeSpent: number = 0;
  totalEstimatedHours: number = 0;
  ranges = [
    { value: 'this_week', label: 'This Week' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' }
  ];
  displayedColumns: string[] = ['ticket', 'subject', 'calculated_time', 'time_spent', 'remaining_time', 'time_log_dates', 'productivity', 'link'];
  
  // New properties for user and project selection
  allUsers: any[] = []; // All users from API
  filteredUsers: any[] = []; // Users filtered by selected projects
  selectedUser: any = null;
  selectedUsers: any[] = []; // For multi-select export
  selectedProjects: number[] = [];
  whitelistedProjects = WHITELISTED_PROJECTS;
  exportLoading = false;

  // Request cancellation properties
  private destroy$ = new Subject<void>();
  private productivityRequest$ = new Subject<{userId: number, projectIds: number[], fromDate?: string, toDate?: string}>();
  private usersRequest$ = new Subject<void>();

  constructor(private redmine: RedmineService) {}

  ngOnInit() {
    // Initialize with all whitelisted projects selected
    this.selectedProjects = this.whitelistedProjects.map(p => p.id);
    
    // Set up request cancellation for users data
    this.usersRequest$.pipe(
      switchMap(() => this.redmine.getUsers()),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (users) => {
        this.allUsers = users;
        this.filterUsersBySelectedProjects();
        // Auto-select first filtered user if available
        if (this.filteredUsers.length > 0) {
          this.selectedUser = this.filteredUsers[0];
          this.fetchProductivity();
        }
      },
      error: (err) => {
        this.error = err.message || 'Failed to load users.';
      }
    });
    
    // Trigger initial users load
    this.usersRequest$.next();
    
    // Set up request cancellation for productivity data
    this.productivityRequest$.pipe(
      debounceTime(300), // Debounce to avoid too many rapid requests
      distinctUntilChanged((prev, curr) => 
        prev.userId === curr.userId && 
        JSON.stringify(prev.projectIds) === JSON.stringify(curr.projectIds) &&
        prev.fromDate === curr.fromDate && 
        prev.toDate === curr.toDate
      ),
      switchMap(params => {
        this.loading = true;
        this.error = '';
        return this.redmine.getProductivity(params.userId, params.projectIds, params.fromDate, params.toDate);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        const { from, to } = this.getDateRange(this.range);
        
        this.productivityTickets = data.map(item => ({
          ticket: item.ticket,
          subject: item.subject,
          calculated_time: item.calculated_time !== undefined ? item.calculated_time : 0,
          time_spent: item.time_spent,
          productivity: item.productivity,
          remaining_time: item.remaining_time,
          link: getIssueUrl(item.ticket),
          timeLogLink: getTimeEntriesUrl(item.ticket, this.selectedUser?.id, from, to),
          created_on: item.created_on,
          updated_on: item.updated_on,
          status: item.status,
          project_name: item.project_name,
          time_log_dates: item.time_log_dates || [],
          time_log_details: item.time_log_details || [],
          first_time_log: item.first_time_log,
          last_time_log: item.last_time_log
        }));
        this.calculateProductivitySummary();
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to load productivity data.';
        this.loading = false;
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getDateRange(range: string) {
    const now = new Date();
    let from: string, to: string;
    if (range === 'this_week') {
      // Get Monday of this week
      const monday = new Date(now);
      const dayOfWeek = monday.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday is 0, so go back 6 days
      monday.setDate(monday.getDate() + daysToMonday);
      
      // Get Sunday of this week
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      
      from = monday.getFullYear() + '-' + String(monday.getMonth() + 1).padStart(2, '0') + '-' + String(monday.getDate()).padStart(2, '0');
      to = sunday.getFullYear() + '-' + String(sunday.getMonth() + 1).padStart(2, '0') + '-' + String(sunday.getDate()).padStart(2, '0');
    } else if (range === 'last_week') {
      // Get Monday of last week
      const monday = new Date(now);
      const dayOfWeek = monday.getDay();
      const daysToMonday = dayOfWeek === 0 ? -13 : 1 - dayOfWeek - 7; // Go back one more week
      monday.setDate(monday.getDate() + daysToMonday);
      
      // Get Sunday of last week
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      
      from = monday.getFullYear() + '-' + String(monday.getMonth() + 1).padStart(2, '0') + '-' + String(monday.getDate()).padStart(2, '0');
      to = sunday.getFullYear() + '-' + String(sunday.getMonth() + 1).padStart(2, '0') + '-' + String(sunday.getDate()).padStart(2, '0');
    } else if (range === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      from = firstDay.getFullYear() + '-' + String(firstDay.getMonth() + 1).padStart(2, '0') + '-' + String(firstDay.getDate()).padStart(2, '0');
      to = lastDay.getFullYear() + '-' + String(lastDay.getMonth() + 1).padStart(2, '0') + '-' + String(lastDay.getDate()).padStart(2, '0');
    } else if (range === 'last_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      from = firstDay.getFullYear() + '-' + String(firstDay.getMonth() + 1).padStart(2, '0') + '-' + String(firstDay.getDate()).padStart(2, '0');
      to = lastDay.getFullYear() + '-' + String(lastDay.getMonth() + 1).padStart(2, '0') + '-' + String(lastDay.getDate()).padStart(2, '0');
    } else {
      from = to = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    }
    return { from, to };
  }

  loadUsers() {
    // Trigger the users request through the subject (this will cancel any pending requests)
    this.usersRequest$.next();
  }

  filterUsersBySelectedProjects() {
    if (this.selectedProjects.length === 0) {
      this.filteredUsers = [];
    } else {
      this.filteredUsers = this.allUsers.filter(user => 
        this.selectedProjects.includes(user.project_id)
      );
    }
    
    // If current selected user is not in filtered users, clear selection
    if (this.selectedUser && !this.filteredUsers.find(u => u.id === this.selectedUser.id)) {
      this.selectedUser = null;
    }
  }

  fetchProductivity() {
    if (!this.selectedUser || this.selectedProjects.length === 0) {
      this.productivityTickets = [];
      this.loading = false;
      return;
    }
    
    // Get date range for filtering
    const { from, to } = this.getDateRange(this.range);
    
    // Trigger the request through the subject (this will cancel any pending requests)
    this.productivityRequest$.next({
      userId: this.selectedUser.id,
      projectIds: this.selectedProjects,
      fromDate: from,
      toDate: to
    });
  }

  onUserChange() {
    this.fetchProductivity();
  }

  onProjectChange() {
    this.filterUsersBySelectedProjects();
    // Auto-select first filtered user if no user is selected
    if (!this.selectedUser && this.filteredUsers.length > 0) {
      this.selectedUser = this.filteredUsers[0];
    }
    this.fetchProductivity();
  }

  onDateRangeChange() {
    this.fetchProductivity();
  }

  getDateRangeLabel() {
    const { from, to } = this.getDateRange(this.range);
    const fromDate = new Date(from).toLocaleDateString();
    const toDate = new Date(to).toLocaleDateString();
    return `${fromDate} to ${toDate}`;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  formatTimeLogDetails(timeLogDetails: any[]): string {
    if (!timeLogDetails || timeLogDetails.length === 0) return 'No time logged';
    
    return timeLogDetails.map(detail => {
      const date = new Date(detail.date).toLocaleDateString();
      return `${date}: ${detail.hours}h`;
    }).join('\n');
  }

  calculateProductivitySummary() {
    if (!this.productivityTickets || this.productivityTickets.length === 0) {
      this.totalProductivity = 0;
      this.averageProductivity = 0;
      this.totalTimeSpent = 0;
      this.totalEstimatedHours = 0;
      return;
    }

    // Calculate totals
    this.totalTimeSpent = this.productivityTickets.reduce((sum, ticket) => sum + (ticket.time_spent || 0), 0);
    const totalCalculatedTime = this.productivityTickets.reduce((sum, ticket) => sum + (ticket.calculated_time || 0), 0);
    this.totalEstimatedHours = totalCalculatedTime; // Store calculated time in totalEstimatedHours for display
    
    // Calculate average productivity based on calculated_time / time_spent
    // Formula: average = (sum of all calculated_time) / (sum of all time_spent) * 100
    this.averageProductivity = this.totalTimeSpent > 0 ? (totalCalculatedTime / this.totalTimeSpent) * 100 : 0;
    this.totalProductivity = 0; // Not used anymore
  }

  exportProductivityData() {
    if (!this.selectedUsers || this.selectedUsers.length === 0) {
      alert('Please select at least one user to export');
      return;
    }

    if (this.selectedProjects.length === 0) {
      alert('Please select at least one project');
      return;
    }

    this.exportLoading = true;

    const { from, to } = this.getDateRange(this.range);
    const userIds = this.selectedUsers.map(u => u.id).join(',');
    const projectIds = this.selectedProjects.join(',');

    // Build URL with parameters (use relative path for proxy)
    let url = `/api/productivity/export?user_ids=${userIds}&project_ids=${projectIds}`;
    
    if (from && to) {
      url += `&from_date=${from}&to_date=${to}`;
    }

    // Use fetch to properly handle the download with loading state
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Export failed');
        }
        return response.blob();
      })
      .then(blob => {
        // Create a blob URL and trigger download
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `productivity_report_${from || 'all'}_to_${to || 'all'}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up blob URL
        window.URL.revokeObjectURL(blobUrl);
        
        this.exportLoading = false;
      })
      .catch(error => {
        console.error('Export error:', error);
        alert('Failed to export CSV. Please try again.');
        this.exportLoading = false;
      });
  }
}
