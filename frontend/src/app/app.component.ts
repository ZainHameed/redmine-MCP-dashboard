import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  activeTab: string = 'projects';
  projects: any[] = [];
  assignedTasks: any[] = [];
  timeLogs: any[] = [];
  ticketDetails: any = null;
  loading = true;
  error = '';
  ticketInput = '';
  ticketLoading = false;
  ticketError = '';
  assignedTasksLoading = false;
  timeLogsLoading = false;
  productivityTickets: any[] = [];
  productivityLoading = false;
  productivityError = '';
  tabIndex = 0;

  // Time log form fields
  logHours: number|null = null;
  logTicket: string = '';
  logDate: string = '';
  logComment: string = '';
  logLoading = false;
  logError = '';
  logSuccess = '';

  // Date range selection
  timeLogRange = 'this_week';
  productivityRange = 'this_week';
  timeLogRanges = [
    { value: 'this_week', label: 'This Week' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' }
  ];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchProjects();
    // Optionally, fetch assigned tasks and time logs here if you want to pre-load
  }

  setTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'tasks' && this.assignedTasks.length === 0) {
      this.fetchAssignedTasks();
    }
    if (tab === 'timelog' && this.timeLogs.length === 0) {
      this.fetchTimeLogs();
    }
    if (tab === 'productivity' && this.productivityTickets.length === 0) {
      this.fetchProductivity();
    }
  }

  fetchProjects() {
    this.loading = true;
    this.http.get<any[]>('/api/projects').subscribe({
      next: (data) => {
        this.projects = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to load projects.';
        this.loading = false;
      }
    });
  }

  fetchAssignedTasks() {
    this.assignedTasksLoading = true;
    this.http.get<any[]>('/api/assigned-tasks').subscribe({
      next: (data) => {
        this.assignedTasks = (data || []).map(task => ({
          id: task.id,
          subject: task.subject,
          status: task.status && task.status.name ? task.status.name : ''
        }));
        this.assignedTasksLoading = false;
      },
      error: (err) => {
        this.assignedTasks = [];
        this.assignedTasksLoading = false;
      }
    });
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

  fetchTimeLogs() {
    this.timeLogsLoading = true;
    const { from, to } = this.getDateRange(this.timeLogRange);
    this.http.get<any[]>(`/api/timelog?from=${from}&to=${to}`).subscribe({
      next: (data) => {
        this.timeLogs = (data || []).map(log => ({
          ticket: log.issue && log.issue.id ? log.issue.id : '',
          hours: log.hours,
          date: log.spent_on
        }));
        this.timeLogsLoading = false;
      },
      error: (err) => {
        this.timeLogs = [];
        this.timeLogsLoading = false;
      }
    });
  }

  fetchTicketDetails() {
    if (!this.ticketInput) return;
    this.ticketLoading = true;
    this.ticketError = '';
    this.ticketDetails = null;
    this.http.get<any>(`/api/tickets/${this.ticketInput}`).subscribe({
      next: (data) => {
        this.ticketDetails = data;
        this.ticketLoading = false;
      },
      error: (err) => {
        this.ticketError = err.message || 'Ticket not found.';
        this.ticketLoading = false;
      }
    });
  }

  fetchProductivity() {
    this.productivityLoading = true;
    this.productivityError = '';
    const { from, to } = this.getDateRange(this.productivityRange);
    this.http.get<any[]>(`/api/timelog?from=${from}&to=${to}`).subscribe({
      next: (logs) => {
        // Group logs by ticket for this period
        const ticketMap: {[key: string]: {time_spent: number}} = {};
        logs.forEach(log => {
          const id = log.issue && log.issue.id ? log.issue.id : '';
          if (!id) return;
          if (!ticketMap[id]) {
            ticketMap[id] = { time_spent: 0 };
          }
          ticketMap[id].time_spent += log.hours;
        });
        const ticketIds = Object.keys(ticketMap);
        if (ticketIds.length === 0) {
          this.productivityTickets = [];
          this.productivityLoading = false;
          return;
        }
        // Fetch ticket details and all time logs for each ticket
        const ticketDetailRequests = ticketIds.map(id => this.http.get<any>(`/api/tickets/${id}`));
        const ticketTimeLogRequests = ticketIds.map(id => this.http.get<any[]>(`/api/ticket-timelogs/${id}`));
        forkJoin([forkJoin(ticketDetailRequests), forkJoin(ticketTimeLogRequests)]).subscribe({
          next: ([ticketDetails, ticketTimeLogs]) => {
            const results: any[] = [];
            ticketIds.forEach((id, idx) => {
              const ticket = ticketDetails[idx];
              const allLogs = ticketTimeLogs[idx];
              const estimated = ticket.estimated_hours || null;
              const subject = ticket.subject || '';
              const totalSpent = allLogs.reduce((sum, log) => sum + (log.hours || 0), 0);
              // Only include if assigned_to.id is 194 (Zain Hameed)
              if (ticket.assigned_to && ticket.assigned_to.id === 194) {
                const productivity = estimated ? Math.round((estimated / totalSpent) * 100) : null;
                results.push({
                  ticket: id,
                  subject,
                  estimated_hours: estimated,
                  time_spent: totalSpent,
                  productivity
                });
              }
            });
            this.productivityTickets = results;
            this.productivityLoading = false;
          },
          error: (err) => {
            this.productivityError = err.message || 'Failed to load productivity data.';
            this.productivityLoading = false;
          }
        });
      },
      error: (err) => {
        this.productivityError = err.message || 'Failed to load productivity data.';
        this.productivityLoading = false;
      }
    });
  }

  logTime() {
    if (!this.logHours || !this.logTicket || !this.logDate) {
      this.logError = 'Please fill all required fields.';
      this.logSuccess = '';
      return;
    }
    this.logLoading = true;
    this.logError = '';
    this.logSuccess = '';
    this.http.post('/api/timelog', {
      hours: this.logHours,
      ticket: this.logTicket,
      date: this.logDate,
      comment: this.logComment
    }).subscribe({
      next: () => {
        this.logSuccess = 'Time logged successfully!';
        this.logLoading = false;
        this.logHours = null;
        this.logTicket = '';
        this.logDate = '';
        this.logComment = '';
        this.fetchTimeLogs();
      },
      error: (err) => {
        this.logError = err.error && err.error.error ? err.error.error : 'Failed to log time.';
        this.logLoading = false;
      }
    });
  }
}
