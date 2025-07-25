import { Component, OnInit } from '@angular/core';
import { RedmineService } from '../../redmine.service';

@Component({
  selector: 'app-assigned-tasks-tab',
  templateUrl: './assigned-tasks-tab.component.html',
  styleUrls: ['./assigned-tasks-tab.component.css']
})
export class AssignedTasksTabComponent implements OnInit {
  assignedTasks: any[] = [];
  loading = true;
  error = '';
  displayedColumns: string[] = ['id', 'subject', 'status', 'link'];

  constructor(private redmine: RedmineService) {}

  ngOnInit() {
    this.loading = true;
    this.redmine.getAssignedTasks().subscribe({
      next: (data) => {
        this.assignedTasks = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to load assigned tasks.';
        this.loading = false;
      }
    });
  }
}
