import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';

import { ProjectsTabComponent } from '../../tabs/projects-tab/projects-tab.component';

const routes: Routes = [
  {
    path: '',
    component: ProjectsTabComponent
  }
];

@NgModule({
  declarations: [
    ProjectsTabComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class ProjectsModule { }
