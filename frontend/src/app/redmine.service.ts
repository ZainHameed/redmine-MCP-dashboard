import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RedmineService {
  constructor(private http: HttpClient) {}

  getProjects(): Observable<any[]> {
    return this.http.get<any[]>('/api/projects');
  }

  getAssignedTasks(): Observable<any[]> {
    return this.http.get<any[]>('/api/assigned-tasks');
  }

  getTimeLogs(from: string, to: string): Observable<any[]> {
    return this.http.get<any[]>(`/api/timelog?from=${from}&to=${to}`);
  }

  logTime(entry: { hours: number; ticket: string; date: string; comment: string }): Observable<any> {
    return this.http.post('/api/timelog', entry);
  }

  getTicketDetails(id: string): Observable<any> {
    return this.http.get<any>(`/api/tickets/${id}`);
  }

  getTicketTimeLogs(id: string): Observable<any[]> {
    return this.http.get<any[]>(`/api/ticket-timelogs/${id}`);
  }
}
