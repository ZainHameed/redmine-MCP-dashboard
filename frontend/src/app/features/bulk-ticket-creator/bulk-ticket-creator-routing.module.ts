import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BulkTicketCreatorComponent } from './components/bulk-ticket-creator.component';

const routes: Routes = [
  {
    path: '',
    component: BulkTicketCreatorComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BulkTicketCreatorRoutingModule { }
