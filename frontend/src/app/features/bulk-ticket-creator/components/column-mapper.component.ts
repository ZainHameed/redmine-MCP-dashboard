import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ColumnMapping } from '../../../types/ticket.types';

@Component({
  selector: 'app-column-mapper',
  templateUrl: './column-mapper.component.html',
  styleUrls: ['./column-mapper.component.css']
})
export class ColumnMapperComponent implements OnInit, OnChanges {
  @Input() csvHeaders: string[] = [];
  @Input() initialMapping: ColumnMapping = {};
  @Output() mappingChange = new EventEmitter<ColumnMapping>();

  mapping: ColumnMapping = {};
  
  redmineFields = [
    { key: 'subject', label: 'Subject', required: false },
    { key: 'assignee', label: 'Assignee', required: false },
    { key: 'estimatedHours', label: 'Estimated Hours', required: false },
    { key: 'description', label: 'Description', required: false },
    { key: 'userStory', label: 'User Story', required: false },
    { key: 'task', label: 'Task', required: false },
    { key: 'subtask', label: 'Subtask', required: false }
  ];

  ngOnInit() {
    // Use initial mapping if provided, otherwise auto-map
    if (this.initialMapping && Object.keys(this.initialMapping).length > 0) {
      this.mapping = { ...this.initialMapping };
      // Don't emit here - parent already has this mapping, emitting would cause unnecessary updates
    } else if (this.csvHeaders.length > 0) {
      // Auto-map common column names only if no initial mapping
      this.autoMapColumns();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Only update mapping if initialMapping changed and has values
    // Also check csvHeaders to avoid resetting when headers are loaded
    if (changes['initialMapping'] && 
        changes['initialMapping'].currentValue && 
        Object.keys(changes['initialMapping'].currentValue).length > 0) {
      // Only update if it's actually different (avoid resetting on every change detection)
      const currentMappingStr = JSON.stringify(this.mapping);
      const newMappingStr = JSON.stringify(changes['initialMapping'].currentValue);
      if (currentMappingStr !== newMappingStr) {
        this.mapping = { ...changes['initialMapping'].currentValue };
        // Don't emit here to avoid infinite loops - parent already has this mapping
      }
    }
    
    // If csvHeaders change but we have existing mapping, preserve it
    if (changes['csvHeaders'] && Object.keys(this.mapping).length > 0) {
      // Keep existing mapping, just update headers reference
      // Don't reset mapping
    }
  }

  autoMapColumns() {
    const headerLower = this.csvHeaders.map(h => h.toLowerCase().trim());
    
    // Common mappings
    const commonMappings: { [key: string]: string[] } = {
      subject: ['subject', 'title', 'name', 'summary'],
      assignee: ['assignee', 'assigned to', 'assigned_to', 'owner'],
      estimatedHours: ['estimated hours', 'estimate', 'estimated_hours', 'hours', 'time'],
      description: ['description', 'desc', 'details', 'notes'],
      userStory: ['user story', 'user_story', 'story', 'epic'],
      task: ['task', 'tasks'],
      subtask: ['subtask', 'sub-task', 'sub_task', 'sub tasks']
    };

    for (const [field, patterns] of Object.entries(commonMappings)) {
      const index = headerLower.findIndex(h => 
        patterns.some(p => h.includes(p) || p.includes(h))
      );
      if (index !== -1) {
        this.mapping[field as keyof ColumnMapping] = this.csvHeaders[index];
      }
    }

    this.emitMapping();
  }

  onFieldChange(field: string, value: string) {
    if (value) {
      this.mapping[field as keyof ColumnMapping] = value;
    } else {
      delete this.mapping[field as keyof ColumnMapping];
    }
    this.emitMapping();
  }

  emitMapping() {
    this.mappingChange.emit({ ...this.mapping });
  }

  isMappingValid(): boolean {
    // Either subject or task must be mapped
    return !!(this.mapping.subject || this.mapping.task);
  }

  getMappingValue(fieldKey: string): string {
    return (this.mapping as any)[fieldKey] || '';
  }
}
