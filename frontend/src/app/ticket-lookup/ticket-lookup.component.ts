import { Component, OnDestroy } from '@angular/core';
import { RedmineService } from '../redmine.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-ticket-lookup',
  templateUrl: './ticket-lookup.component.html',
  styleUrls: ['./ticket-lookup.component.css']
})
export class TicketLookupComponent implements OnDestroy {
  ticketInput = '';
  ticketDetails: any = null;
  loading = false;
  error = '';
  private searchSubject = new Subject<string>();
  private searchSub: Subscription;

  constructor(private redmine: RedmineService) {
    this.searchSub = this.searchSubject.pipe(debounceTime(700)).subscribe((val) => {
      if (val) {
        this.fetchTicketDetails(val);
      }
    });
  }

  onInputChange() {
    this.searchSubject.next(this.ticketInput);
  }

  fetchTicketDetails(ticketNum?: string) {
    const ticket = ticketNum !== undefined ? ticketNum : this.ticketInput;
    if (!ticket) return;
    this.loading = true;
    this.error = '';
    this.ticketDetails = null;
    this.redmine.getTicketDetails(ticket).subscribe({
      next: (data) => {
        this.ticketDetails = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Ticket not found.';
        this.loading = false;
      }
    });
  }

  closeDetails() {
    this.ticketDetails = null;
    this.ticketInput = '';
  }

  ngOnDestroy() {
    this.searchSub.unsubscribe();
  }
}
