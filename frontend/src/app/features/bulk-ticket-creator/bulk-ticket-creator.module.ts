import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

// PrimeNG imports
import { TreeTableModule } from 'primeng/treetable';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { FileUploadModule } from 'primeng/fileupload';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CardModule } from 'primeng/card';
import { StepsModule } from 'primeng/steps';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { BulkTicketCreatorComponent } from './components/bulk-ticket-creator.component';
import { ColumnMapperComponent } from './components/column-mapper.component';
import { TicketTreePreviewComponent } from './components/ticket-tree-preview.component';

const routes: Routes = [
  {
    path: '',
    component: BulkTicketCreatorComponent
  }
];

@NgModule({
  declarations: [
    BulkTicketCreatorComponent,
    ColumnMapperComponent,
    TicketTreePreviewComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    RouterModule.forChild(routes),
    TreeTableModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    FileUploadModule,
    ProgressSpinnerModule,
    CardModule,
    StepsModule,
    ToastModule
  ],
  providers: [MessageService]
})
export class BulkTicketCreatorModule { }
