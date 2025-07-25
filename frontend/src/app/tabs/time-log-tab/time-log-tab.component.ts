import { Component, OnInit } from '@angular/core';
import { RedmineService } from '../../redmine.service';

@Component({
  selector: 'app-time-log-tab',
  templateUrl: './time-log-tab.component.html',
  styleUrls: ['./time-log-tab.component.css']
})
export class TimeLogTabComponent implements OnInit {
  timeLogs: any[] = [];
  loading = true;
  error = '';
  logHours: number|null = null;
  logTicket: string = '';
  logDate: string = '';
  logComment: string = '';
  logLoading = false;
  logError = '';
  logSuccess = '';
  range = 'this_week';
  ranges = [
    { value: 'this_week', label: 'This Week' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' }
  ];
  displayedColumns: string[] = ['ticket', 'hours', 'date', 'link'];

  constructor(private redmine: RedmineService) {}

  ngOnInit() {
    this.fetchTimeLogs();
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
    this.loading = true;
    const { from, to } = this.getDateRange(this.range);
    this.redmine.getTimeLogs(from, to).subscribe({
      next: (data) => {
        this.timeLogs = (data || []).map(log => ({
          ticket: log.issue && log.issue.id ? log.issue.id : '',
          hours: log.hours,
          date: log.spent_on
        }));
        this.loading = false;
      },
      error: (err) => {
        this.timeLogs = [];
        this.loading = false;
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
    this.redmine.logTime({
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
