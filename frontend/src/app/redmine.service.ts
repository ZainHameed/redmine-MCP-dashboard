import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RedmineService {
  constructor(private http: HttpClient) {}

  getProjects(): Observable<any[]> {
    return this.http.get<any[]>('/api/projects');
  }

  getAssignedTasks(projectId?: number, userId?: number): Observable<any[]> {
    let url = '/api/assigned-tasks';
    const params = new URLSearchParams();
    if (projectId) params.append('project_id', projectId.toString());
    if (userId) params.append('user_id', userId.toString());
    if (params.toString()) url += '?' + params.toString();
    return this.http.get<any[]>(url);
  }

  getUsers(): Observable<any[]> {
    return this.http.get<any[]>('/api/users');
  }

  getProductivity(userId: number, projectIds: number[], fromDate?: string, toDate?: string): Observable<any[]> {
    const params: any = {
      user_id: userId.toString(),
      project_ids: projectIds.join(',')
    };
    
    if (fromDate && toDate) {
      params.from_date = fromDate;
      params.to_date = toDate;
    }
    
    return this.http.get<any[]>(`/api/productivity`, { params });
  }

  getTicketDetails(id: string): Observable<any> {
    return this.http.get<any>(`/api/tickets/${id}`);
  }

}
