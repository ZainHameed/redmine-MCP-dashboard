import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  activeTab: string = 'projects';
  projects: any[] = [];
  ticketDetails: any = null;
  loading = true;
  error = '';
  ticketInput = '';
  ticketLoading = false;
  ticketError = '';
  tabIndex = 0;
  
  // Health check properties
  healthCheckLoading = false;
  healthCheckResult: any = null;
  appVersion = environment.appVersion;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.fetchProjects();
    
    // Set initial tab based on current route
    const currentUrl = this.router.url;
    if (currentUrl.includes('/productivity')) {
      this.tabIndex = 1;
      this.activeTab = 'productivity';
    } else {
      this.tabIndex = 0;
      this.activeTab = 'projects';
    }
  }

  setTab(tab: string) {
    this.activeTab = tab;
    // Navigate to the appropriate route
    switch(tab) {
      case 'projects':
        this.router.navigate(['/projects']);
        this.tabIndex = 0;
        break;
      case 'productivity':
        this.router.navigate(['/productivity']);
        this.tabIndex = 1;
        break;
    }
  }

  onTabChange(event: any) {
    const tabIndex = event.index;
    switch(tabIndex) {
      case 0:
        this.router.navigate(['/projects']);
        this.activeTab = 'projects';
        break;
      case 1:
        this.router.navigate(['/productivity']);
        this.activeTab = 'productivity';
        break;
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



  // Health check method
  checkHealth() {
    this.healthCheckLoading = true;
    this.healthCheckResult = null;
    
    this.http.get('/api/health').subscribe({
      next: (result: any) => {
        this.healthCheckResult = result;
        this.appVersion = result.version || '1.0.0';
        this.healthCheckLoading = false;
        
        // Show success message
        alert(`✅ Health Check Passed!\n\nVersion: ${result.version}\nStatus: ${result.status}\nEnvironment: ${result.environment}\nUptime: ${Math.round(result.uptime)}s\nMemory: ${result.memory.used}`);
      },
      error: (error) => {
        this.healthCheckResult = { error: error.message };
        this.healthCheckLoading = false;
        
        // Show error message
        alert(`❌ Health Check Failed!\n\nError: ${error.message || 'Unknown error'}`);
      }
    });
  }
}
