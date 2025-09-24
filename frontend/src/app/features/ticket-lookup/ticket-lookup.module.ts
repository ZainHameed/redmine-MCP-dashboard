import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

import { TicketLookupComponent } from '../../ticket-lookup/ticket-lookup.component';

const routes: Routes = [
  {
    path: '',
    component: TicketLookupComponent
  }
];

@NgModule({
  declarations: [
    TicketLookupComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    RouterModule.forChild(routes)
  ],
  exports: [
    TicketLookupComponent
  ]
})
export class TicketLookupModule { }
