import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TicketNode, ColumnMapping, TicketCreationResponse } from '../../../types/ticket.types';
import { BulkTicketService } from '../../../services/bulk-ticket.service';
import { RedmineService } from '../../../redmine.service';

@Component({
  selector: 'app-bulk-ticket-creator',
  templateUrl: './bulk-ticket-creator.component.html',
  styleUrls: ['./bulk-ticket-creator.component.css'],
  providers: [MessageService]
})
export class BulkTicketCreatorComponent implements OnInit {
  currentStep = 0;
  steps = [
    { label: 'Upload & Map' },
    { label: 'Preview & Polish' },
    { label: 'Execute' }
  ];

  // Step 1: Upload & Map
  selectedFile: File | null = null;
  csvHeaders: string[] = [];
  columnMapping: ColumnMapping = {};
  mappingValid = false;
  userStoryId: number | null = null;
  userStories: any[] = [];
  loadingUserStories = false;

  // Step 2: Preview & Polish
  ticketTree: TicketNode[] = [];
  originalCsvData: any[] = [];
  lastPreviewParams: { fileName: string, fileSize: number, mapping: ColumnMapping, userStoryId: number | null | undefined } | null = null;

  // Step 3: Execute
  executionResults: TicketCreationResponse | null = null;
  executing = false;
  creationProgress = { current: 0, total: 0 };
  projectId: number | null = null;
  projects: any[] = [];

  constructor(
    private bulkTicketService: BulkTicketService,
    private redmineService: RedmineService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.redmineService.getProjects().subscribe({
      next: (projects) => {
        // Filter to show only Panavid and AI Training projects
        this.projects = projects.filter((p: any) => 
          p.id === 944 || // Panavid Fixed Cost Projects
          p.id === 1586 || // AI Training
          p.name.toLowerCase().includes('ai training') || 
          p.identifier === 'ai-training' ||
          p.name.toLowerCase().includes('panavid')
        );
        
        // Sort: AI Training first, then Panavid
        this.projects.sort((a: any, b: any) => {
          if (a.id === 1586) return -1;
          if (b.id === 1586) return 1;
          if (a.id === 944) return -1;
          if (b.id === 944) return 1;
          return 0;
        });
        
        // Try to find AI TRAINING project first (for testing)
        const aiTraining = this.projects.find((p: any) => 
          p.id === 1586 ||
          p.name.toLowerCase().includes('ai training') || 
          p.identifier === 'ai-training'
        );
        if (aiTraining) {
          this.projectId = aiTraining.id;
          this.loadUserStories(aiTraining.id);
        } else {
          // Fallback to Panavid if AI Training not found
          const panavid = this.projects.find((p: any) => p.id === 944);
          if (panavid) {
            this.projectId = panavid.id;
            this.loadUserStories(panavid.id);
          }
        }
      },
      error: (error) => {
        console.error('Failed to load projects:', error);
      }
    });
  }

  onProjectChange() {
    if (this.projectId) {
      this.loadUserStories(this.projectId);
      this.userStoryId = null; // Reset user story when project changes
    }
  }

  loadUserStories(projectId: number) {
    this.loadingUserStories = true;
    this.bulkTicketService.getUserStories(projectId).subscribe({
      next: (stories) => {
        this.userStories = stories;
        this.loadingUserStories = false;
      },
      error: (error) => {
        console.error('Failed to load user stories:', error);
        this.userStories = [];
        this.loadingUserStories = false;
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      this.selectedFile = file;
      this.parseCSVHeaders(file);
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid File',
        detail: 'Please select a CSV file'
      });
    }
  }

  parseCSVHeaders(file: File) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const text = e.target.result;
      const lines = text.split('\n');
      if (lines.length > 0) {
        this.csvHeaders = lines[0].split(',').map((h: string) => h.trim().replace(/"/g, ''));
      }
    };
    reader.readAsText(file);
  }

  onMappingChange(mapping: ColumnMapping) {
    this.columnMapping = mapping;
    // Either subject or task must be mapped
    this.mappingValid = !!(mapping.subject || mapping.task);
  }

  onPreview() {
    if (!this.selectedFile || !this.mappingValid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please upload a CSV file and map the required columns'
      });
      return;
    }

    // Check if we need to regenerate preview (file, mapping, or userStoryId changed)
    const currentParams = {
      fileName: this.selectedFile?.name || '',
      fileSize: this.selectedFile?.size || 0,
      mapping: this.columnMapping,
      userStoryId: this.userStoryId || undefined
    };

    const needsRegeneration = !this.lastPreviewParams ||
      this.lastPreviewParams.fileName !== currentParams.fileName ||
      this.lastPreviewParams.fileSize !== currentParams.fileSize ||
      JSON.stringify(this.lastPreviewParams.mapping) !== JSON.stringify(currentParams.mapping) ||
      this.lastPreviewParams.userStoryId !== currentParams.userStoryId;

    // If we already have a tree and nothing changed, just go to step 1 without regenerating
    if (!needsRegeneration && this.ticketTree.length > 0) {
      this.currentStep = 1;
      this.messageService.add({
        severity: 'info',
        summary: 'Preview Loaded',
        detail: 'Using existing preview data'
      });
      setTimeout(() => {
        this.cdr.detectChanges();
      }, 0);
      return;
    }

    // Generate new preview
    this.bulkTicketService.uploadAndPreview(this.selectedFile, this.columnMapping, this.userStoryId || undefined, this.projectId || undefined).subscribe({
      next: (tree) => {
        console.log('Preview API returned tree:', tree);
        console.log('Tree length:', tree.length);
        this.ticketTree = [...tree];
        this.lastPreviewParams = {
          fileName: this.selectedFile?.name || '',
          fileSize: this.selectedFile?.size || 0,
          mapping: { ...this.columnMapping },
          userStoryId: this.userStoryId || undefined
        };
        this.currentStep = 1;
        const totalNodes = this.countNodes(tree);
        this.messageService.add({
          severity: 'success',
          summary: 'Preview Generated',
          detail: `Found ${totalNodes} tickets`
        });
        // Force change detection after view update
        setTimeout(() => {
          this.cdr.detectChanges();
        }, 0);
      },
      error: (error) => {
        console.error('Preview error:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Preview Failed',
          detail: error.error?.error || 'Failed to generate preview'
        });
      }
    });
  }

  onTreeChange(tree: TicketNode[]) {
    // Deep clone to preserve the tree state
    this.ticketTree = JSON.parse(JSON.stringify(tree));
    // Force change detection to update button state
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  onExecute() {
    if (!this.projectId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Project Required',
        detail: 'Please select a project'
      });
      return;
    }

    if (this.hasInvalidNodes()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fix all invalid tickets before creating'
      });
      return;
    }

    this.executing = true;
    this.currentStep = 2;
    
    // Calculate total nodes for progress
    const totalNodes = this.countNodes(this.ticketTree);
    this.creationProgress = { current: 0, total: totalNodes };

    // Simulate progress updates (approximate based on time)
    // Progress will be updated gradually to show user that work is in progress
    const startTime = Date.now();
    const estimatedDuration = Math.max(totalNodes * 300, 5000); // ~300ms per ticket, minimum 5 seconds
    const progressInterval = setInterval(() => {
      if (this.executing) {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(Math.floor((elapsed / estimatedDuration) * totalNodes), totalNodes - 1);
        if (progress > this.creationProgress.current) {
          this.creationProgress.current = progress;
          this.cdr.detectChanges();
        }
      } else {
        clearInterval(progressInterval);
      }
    }, 200); // Update every 200ms

    this.bulkTicketService.executeCreation(this.ticketTree, this.projectId).subscribe({
      next: (results) => {
        clearInterval(progressInterval);
        this.creationProgress = { current: results.summary.total, total: results.summary.total };
        this.executionResults = results;
        this.executing = false;
        
        if (results.summary.failed === 0) {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Successfully created ${results.summary.succeeded} tickets`
          });
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Partial Success',
            detail: `Created ${results.summary.succeeded} tickets, ${results.summary.failed} failed`
          });
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        clearInterval(progressInterval);
        this.executing = false;
        this.creationProgress = { current: 0, total: 0 };
        this.messageService.add({
          severity: 'error',
          summary: 'Execution Failed',
          detail: error.error?.error || 'Failed to create tickets'
        });
        this.cdr.detectChanges();
      }
    });
  }

  onDownloadResults() {
    if (this.executionResults) {
      this.bulkTicketService.downloadResultsCSV(
        this.executionResults.results,
        this.ticketTree
      );
    }
  }

  onCleanupTestTickets() {
    if (!this.executionResults) {
      return;
    }
    
    // Extract all created ticket IDs (excluding existing stories)
    const ticketIds = this.executionResults.results
      .filter(r => r.success && r.redmineId && !r.isExistingStory)
      .map(r => r.redmineId as number);
    
    if (ticketIds.length === 0) {
      this.messageService.add({
        severity: 'info',
        summary: 'No Tickets to Delete',
        detail: 'No test tickets found to cleanup'
      });
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${ticketIds.length} test tickets?`)) {
      return;
    }
    
    this.bulkTicketService.cleanupTestTickets(ticketIds).subscribe({
      next: (response) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Cleanup Complete',
          detail: `Deleted ${response.deleted} tickets, ${response.failed} failed`
        });
        // Reset execution results after cleanup
        this.executionResults = null;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Cleanup Failed',
          detail: error.error?.error || 'Failed to cleanup tickets'
        });
      }
    });
  }

  countNodes(nodes: TicketNode[]): number {
    let count = 0;
    for (const node of nodes) {
      count++;
      count += this.countNodes(node.children);
    }
    return count;
  }


  onBack() {
    if (this.currentStep > 0) {
      this.currentStep--;
      // Force change detection to update UI
      setTimeout(() => {
        this.cdr.detectChanges();
      }, 0);
    }
  }

  onNext() {
    if (this.currentStep === 0) {
      this.onPreview();
    } else if (this.currentStep === 1) {
      this.onExecute();
    }
  }

  canProceed(): boolean {
    if (this.currentStep === 0) {
      return this.mappingValid && !!this.selectedFile;
    } else if (this.currentStep === 1) {
      return !this.hasInvalidNodes() && this.ticketTree.length > 0;
    }
    return false;
  }

  hasInvalidNodes(): boolean {
    return this.checkTreeInvalid(this.ticketTree);
  }

  checkTreeInvalid(nodes: TicketNode[]): boolean {
    if (!nodes || nodes.length === 0) return false;
    
    for (const node of nodes) {
      // Skip virtual story nodes from assignee validation
      if (node.tempId && node.tempId.startsWith('story-')) {
        if (this.checkTreeInvalid(node.children)) {
          return true;
        }
        continue;
      }
      
      // Check if node is invalid
      if (!node.isValid) {
        return true;
      }
      
      // Check if assignee is missing (only for non-story nodes)
      if (!node.data.assignee_id) {
        return true;
      }
      
      // Check children recursively
      if (this.checkTreeInvalid(node.children)) {
        return true;
      }
    }
    
    return false;
  }
}
