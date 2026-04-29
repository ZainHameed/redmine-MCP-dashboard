import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { TicketNode, RedmineUser } from '../../../types/ticket.types';
import { BulkTicketService } from '../../../services/bulk-ticket.service';

@Component({
  selector: 'app-ticket-tree-preview',
  templateUrl: './ticket-tree-preview.component.html',
  styleUrls: ['./ticket-tree-preview.component.css']
})
export class TicketTreePreviewComponent implements OnInit, OnChanges {
  @Input() tree: TicketNode[] = [];
  @Input() projectId: number | null = null;
  @Output() treeChange = new EventEmitter<TicketNode[]>();

  users: RedmineUser[] = [];
  loading = false;
  displayTree: TicketNode[] = [];

  constructor(
    private bulkTicketService: BulkTicketService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadUsers(this.projectId || undefined);
    // Initialize displayTree from input tree if available
    if (this.tree && this.tree.length > 0) {
      this.prepareTreeForDisplay();
    } else {
      this.displayTree = [];
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['tree']) {
      const currentTree = changes['tree'].currentValue;
      console.log('Tree changed in ngOnChanges:', currentTree);
      console.log('Tree length:', currentTree?.length || 0);
      if (currentTree && Array.isArray(currentTree) && currentTree.length > 0) {
        this.prepareTreeForDisplay();
      } else {
        this.displayTree = [];
      }
    }
    if (changes['projectId'] && this.projectId) {
      // Reload users when project changes
      this.loadUsers(this.projectId);
    }
  }

  loadUsers(projectId?: number) {
    this.loading = true;
    this.bulkTicketService.getUsers(projectId).subscribe({
      next: (users) => {
        this.users = users || [];
        this.loading = false;
        console.log('Users loaded:', this.users.length);
        // Table should render even if users are empty
        if (this.users.length === 0) {
          console.warn('No users loaded - table will still display but assignee dropdowns will be empty');
        }
      },
      error: (error) => {
        console.error('Failed to load users:', error);
        this.users = []; // Set empty array on error
        this.loading = false;
        // Don't block table rendering if users fail to load
        console.warn('Continuing without users - table will display with empty assignee dropdowns');
      }
    });
  }

  prepareTreeForDisplay() {
    // Deep clone and prepare tree for PrimeNG TreeTable
    // PrimeNG TreeTable expects nodes with 'data' and 'children' properties
    // Our structure already matches: { data: {...}, children: [...], level, tempId, isValid }
    if (!this.tree || !Array.isArray(this.tree)) {
      console.warn('Tree is not a valid array:', this.tree);
      this.displayTree = [];
      return;
    }
    
    // Clone the tree structure - PrimeNG TreeTable will handle the hierarchy
    // The expanded property is set in cloneNode to show all children by default
    this.displayTree = this.tree.map(node => this.cloneNode(node));
    
    console.log('Display tree prepared, length:', this.displayTree.length);
    if (this.displayTree.length > 0) {
      console.log('First node level:', this.displayTree[0].level);
      console.log('First node subject:', this.displayTree[0].data.subject);
      console.log('First node children count:', this.displayTree[0].children?.length || 0);
      // Log full structure for debugging
      console.log('First node full structure:', this.displayTree[0]);
    }
  }

  cloneNode(node: TicketNode): TicketNode {
    // Ensure children is always an array (PrimeNG TreeTable requirement)
    // PrimeNG TreeTable expects: { data: {...}, children: [...] }
    // Our structure already matches this, just ensure children is always an array
    // Also add expanded property for TreeTable to show children by default
    const cloned: TicketNode = {
      tempId: node.tempId,
      level: node.level,
      data: { ...node.data },
      children: [],
      isValid: node.isValid,
      expanded: true // Add expanded property to show children by default
    } as any; // TypeScript doesn't know about expanded, but PrimeNG uses it
    
    if (node.children && Array.isArray(node.children) && node.children.length > 0) {
      cloned.children = node.children.map(child => this.cloneNode(child));
    }
    
    return cloned;
  }

  updateTreeData() {
    // Update the original tree reference
    this.tree = this.displayTree;
    // Force change detection
    this.cdr.detectChanges();
    // Emit the updated tree with deep clone to preserve all changes
    const clonedTree = this.displayTree.map(node => this.cloneNode(node));
    this.treeChange.emit(clonedTree);
  }


  onEstimateChange(node: TicketNode, value: string) {
    const hours = parseFloat(value) || 0;
    node.data.estimated_hours = hours;
    node.isValid = this.validateNode(node);
    // Update both displayTree and original tree
    this.updateNodeInTree(this.displayTree, node.tempId, (n) => {
      n.data.estimated_hours = hours;
      n.isValid = this.validateNode(n);
    });
    this.updateTreeData();
  }

  onAssigneeChange(node: TicketNode, userId: number | null) {
    node.data.assignee_id = userId;
    if (userId) {
      const user = this.users.find(u => u.id === userId);
      node.data.original_assignee_name = user ? user.name : '';
    }
    node.isValid = this.validateNode(node);
    // Update both displayTree and original tree
    this.updateNodeInTree(this.displayTree, node.tempId, (n) => {
      n.data.assignee_id = userId;
      if (userId) {
        const user = this.users.find(u => u.id === userId);
        n.data.original_assignee_name = user ? user.name : '';
      }
      n.isValid = this.validateNode(n);
    });
    this.updateTreeData();
  }

  updateNodeInTree(nodes: TicketNode[], tempId: string, updater: (node: TicketNode) => void): boolean {
    for (const node of nodes) {
      if (node.tempId === tempId) {
        updater(node);
        return true;
      }
      if (node.children && this.updateNodeInTree(node.children, tempId, updater)) {
        return true;
      }
    }
    return false;
  }

  validateNode(node: TicketNode): boolean {
    if (!node.data.subject || node.data.subject.trim() === '') {
      return false;
    }
    if (isNaN(node.data.estimated_hours) || node.data.estimated_hours < 0) {
      return false;
    }
    return true;
  }

  getUserName(userId: number | null): string {
    if (!userId) return '';
    const user = this.users.find(u => u.id === userId);
    return user ? user.name : '';
  }

  hasInvalidNodes(): boolean {
    return this.checkTreeInvalid(this.displayTree);
  }

  checkTreeInvalid(nodes: TicketNode[]): boolean {
    if (!nodes || nodes.length === 0) return false;
    
    for (const node of nodes) {
      // Skip virtual story nodes from assignee validation (they don't need assignees)
      if (node.tempId && node.tempId.startsWith('story-')) {
        // Still check children
        if (this.checkTreeInvalid(node.children)) {
          return true;
        }
        continue;
      }
      
      // Check if node is invalid (missing subject or invalid hours)
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

  getIndent(node: TicketNode): number {
    if (node.level === 'Story') return 0;
    if (node.level === 'Task') return 20;
    if (node.level === 'Subtask') return 40;
    return 0;
  }

  isValidEstimate(hours: number): boolean {
    return !isNaN(hours) && hours >= 0;
  }

  // Debug helper to inspect rowNode structure
  debugRowNode(rowNode: any): void {
    console.log('rowNode:', rowNode);
    console.log('rowNode.node:', rowNode?.node);
    console.log('rowNode keys:', rowNode ? Object.keys(rowNode) : 'null');
  }

}
