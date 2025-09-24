import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Core Module
 * 
 * This module contains singleton services, guards, and other core functionality
 * that should be available throughout the application. It's eagerly loaded
 * and imported by the root AppModule.
 */
@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ],
  exports: []
})
export class CoreModule { }
