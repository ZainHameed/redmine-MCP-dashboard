import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TicketNode, ColumnMapping, RedmineUser, TicketCreationResponse } from '../types/ticket.types';

@Injectable({
  providedIn: 'root'
})
export class BulkTicketService {
  private apiUrl = '/api/bulk-tickets';

  constructor(private http: HttpClient) {}

  /**
   * Upload CSV and get preview tree
   */
  uploadAndPreview(file: File, mapping: ColumnMapping, userStoryId?: number, projectId?: number): Observable<TicketNode[]> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));
    if (userStoryId) {
      formData.append('userStoryId', userStoryId.toString());
    }
    if (projectId) {
      formData.append('projectId', projectId.toString());
    }

    return this.http.post<TicketNode[]>(`${this.apiUrl}/preview`, formData);
  }

  /**
   * Get user stories for a project
   */
  getUserStories(projectId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user-stories`, {
      params: { projectId: projectId.toString() }
    });
  }

  /**
   * Get users for dropdown
   */
  getUsers(projectId?: number): Observable<RedmineUser[]> {
    let params = new HttpParams();
    if (projectId) {
      params = params.set('projectId', projectId.toString());
    }
    return this.http.get<RedmineUser[]>(`${this.apiUrl}/users`, { params });
  }

  /**
   * Execute ticket creation
   */
  executeCreation(tree: TicketNode[], projectId: number): Observable<TicketCreationResponse> {
    return this.http.post<TicketCreationResponse>(`${this.apiUrl}/execute`, {
      tree,
      projectId
    });
  }

  /**
   * Cleanup test tickets
   */
  cleanupTestTickets(ticketIds: number[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/cleanup`, { ticketIds });
  }

  /**
   * Download results CSV
   */
  downloadResultsCSV(results: any[], originalData: any[]): void {
    // Create CSV content
    const headers = ['Original Subject', 'Redmine Ticket ID', 'Status', 'Error'];
    const rows = results.map(result => {
      const original = originalData.find(d => d.tempId === result.tempId);
      return [
        original?.data?.subject || '',
        result.redmineId || '',
        result.success ? 'Success' : 'Failed',
        result.error || ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bulk-ticket-results-${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
