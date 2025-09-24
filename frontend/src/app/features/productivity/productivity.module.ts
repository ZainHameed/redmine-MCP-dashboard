import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

import { ProductivityTabComponent } from '../../tabs/productivity-tab/productivity-tab.component';

const routes: Routes = [
  {
    path: '',
    component: ProductivityTabComponent
  }
];

@NgModule({
  declarations: [
    ProductivityTabComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class ProductivityModule { }
