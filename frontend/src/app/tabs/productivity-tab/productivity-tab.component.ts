import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { takeUntil, switchMap, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { RedmineService } from '../../redmine.service';
import { WHITELISTED_PROJECTS } from '../../core/constants/projects.constants';
import { getIssueUrl } from '../../core/constants/redmine.constants';

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
  ranges = [
    { value: 'this_week', label: 'This Week' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' }
  ];
  displayedColumns: string[] = ['ticket', 'subject', 'estimated_hours', 'time_spent', 'productivity', 'link'];
  
  // New properties for user and project selection
  allUsers: any[] = []; // All users from API
  filteredUsers: any[] = []; // Users filtered by selected projects
  selectedUser: any = null;
  selectedProjects: number[] = [];
  whitelistedProjects = WHITELISTED_PROJECTS;

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
        this.productivityTickets = data.map(item => ({
          ticket: item.ticket,
          subject: item.subject,
          estimated_hours: item.estimated_hours,
          time_spent: item.time_spent,
          productivity: item.productivity,
          link: getIssueUrl(item.ticket),
          created_on: item.created_on,
          updated_on: item.updated_on,
          status: item.status,
          project_name: item.project_name
        }));
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
      const first = now.getDate() - now.getDay() + 1;
      const monday = new Date(now.setDate(first));
      const sunday = new Date(now.setDate(first + 6));
      from = monday.toISOString().slice(0, 10);
      to = sunday.toISOString().slice(0, 10);
    } else if (range === 'last_week') {
      const first = now.getDate() - now.getDay() - 6;
      const monday = new Date(now.setDate(first));
      const sunday = new Date(now.setDate(first + 6));
      from = monday.toISOString().slice(0, 10);
      to = sunday.toISOString().slice(0, 10);
    } else if (range === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      from = firstDay.toISOString().slice(0, 10);
      to = lastDay.toISOString().slice(0, 10);
    } else if (range === 'last_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      from = firstDay.toISOString().slice(0, 10);
      to = lastDay.toISOString().slice(0, 10);
    } else {
      from = to = now.toISOString().slice(0, 10);
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
}
