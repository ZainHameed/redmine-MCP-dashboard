import { Component, OnInit } from '@angular/core';
import { RedmineService } from '../../redmine.service';

@Component({
  selector: 'app-projects-tab',
  templateUrl: './projects-tab.component.html',
  styleUrls: ['./projects-tab.component.css']
})
export class ProjectsTabComponent implements OnInit {
  projects: any[] = [];
  loading = true;
  error = '';
  displayedColumns: string[] = ['name', 'description', 'link'];

  constructor(private redmine: RedmineService) {}

  ngOnInit() {
    this.loading = true;
    this.redmine.getProjects().subscribe({
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
}
