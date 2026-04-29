import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/projects',
    pathMatch: 'full'
  },
  {
    path: 'projects',
    loadChildren: () => import('./features/projects/projects.module').then(m => m.ProjectsModule)
  },
  {
    path: 'productivity',
    loadChildren: () => import('./features/productivity/productivity.module').then(m => m.ProductivityModule)
  },
  {
    path: 'ticket-lookup',
    loadChildren: () => import('./features/ticket-lookup/ticket-lookup.module').then(m => m.TicketLookupModule)
  },
  {
    path: 'bulk-ticket-creator',
    loadChildren: () => import('./features/bulk-ticket-creator/bulk-ticket-creator.module').then(m => m.BulkTicketCreatorModule)
  },
  {
    path: '**',
    redirectTo: '/projects'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
