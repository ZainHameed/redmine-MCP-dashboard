import { Component, OnInit } from '@angular/core';
import { RedmineService } from '../../redmine.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-productivity-tab',
  templateUrl: './productivity-tab.component.html',
  styleUrls: ['./productivity-tab.component.css']
})
export class ProductivityTabComponent implements OnInit {
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

  constructor(private redmine: RedmineService) {}

  ngOnInit() {
    this.fetchProductivity();
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

  fetchProductivity() {
    this.loading = true;
    this.error = '';
    const { from, to } = this.getDateRange(this.range);
    this.redmine.getTimeLogs(from, to).subscribe({
      next: (logs) => {
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
          this.loading = false;
          return;
        }
        const ticketDetailRequests = ticketIds.map(id => this.redmine.getTicketDetails(id));
        const ticketTimeLogRequests = ticketIds.map(id => this.redmine.getTicketTimeLogs(id));
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
            this.loading = false;
          },
          error: (err) => {
            this.error = err.message || 'Failed to load productivity data.';
            this.loading = false;
          }
        });
      },
      error: (err) => {
        this.error = err.message || 'Failed to load productivity data.';
        this.loading = false;
      }
    });
  }
}
