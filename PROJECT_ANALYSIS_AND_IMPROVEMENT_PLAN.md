# Redmine MCP Dashboard - Project Analysis & Improvement Plan

## 📊 Current State Analysis

### Project Structure Overview
```
redmine-MCP-dashboard/
├── backend/
│   ├── index.js (155 lines - Express server)
│   ├── package.json (Node.js dependencies)
│   └── node_modules/
├── frontend/
│   ├── src/app/
│   │   ├── app.component.ts (259 lines - Main component)
│   │   ├── redmine.service.ts (32 lines - API service)
│   │   ├── tabs/ (4 tab components)
│   │   └── ticket-lookup/ (Search component)
│   ├── package.json (Angular 15 dependencies)
│   └── angular.json
├── .cursor/mcp.json (Configuration file)
└── README.md
```

### 🔍 Current Implementation Details

#### Backend (Node.js/Express)
- **Technology Stack**: Node.js with Express.js, Axios for HTTP requests, CORS enabled
- **Configuration**: Reads from `.cursor/mcp.json` file
- **API Endpoints**:
  - `GET /api/projects` - Fetches all projects
  - `GET /api/assigned-tasks` - Hardcoded for 'Panavid Fixed Cost Projects' and user 'zain.hameed'
  - `GET /api/timelog` - Time entries with date filtering
  - `POST /api/timelog` - Log time entries
  - `GET /api/tickets/:id` - Ticket details by ID
  - `GET /api/ticket-timelogs/:id` - Time logs for specific ticket

**Issues Identified**:
- ❌ Hardcoded project name and username in multiple endpoints
- ❌ Single API key configuration (not user-specific)
- ❌ Configuration stored in non-standard `.cursor/mcp.json` file
- ❌ No environment-based configuration

#### Frontend (Angular 15)
- **Technology Stack**: Angular 15, Angular Material, RxJS
- **Components Structure**:
  - `AppComponent` (259 lines) - Monolithic main component
  - `ProjectsTabComponent` - Simple project listing
  - `AssignedTasksTabComponent` - Hardcoded task filtering
  - `TimeLogTabComponent` - Time logging functionality
  - `ProductivityTabComponent` - Productivity metrics (hardcoded user ID: 194)
  - `TicketLookupComponent` - Ticket search with debouncing

**Issues Identified**:
- ❌ Non-modular architecture - everything in root module
- ❌ Hardcoded user ID (194) in productivity calculations
- ❌ No dynamic user selection
- ❌ Duplicated logic across components (date range calculations)
- ❌ No reusable pagination component
- ❌ Mixed concerns in AppComponent (259 lines)
- ❌ No proper state management
- ❌ Hardcoded URLs in proxy configuration

#### Configuration Management
- **Current**: `.cursor/mcp.json` with hardcoded values
```json
{
  "mcp-server-redmine": {
    "REDMINE_HOST": "https://redmine.rolustech.com/projects.json",
    "REDMINE_API_KEY": "cfdcc03184edf6acafb3ec7fd5196fc3b044ca0c"
  }
}
```

### 🎯 User Requirements Analysis

Based on your requirements, here's what needs to be changed:

1. **✅ Keep**: Ticket lookup functionality
2. **❌ Remove**: Time logging features, Time log tab, Assigned tasks tab
3. **🔄 Modify**: Only 2 tabs (Projects & Productivity)
4. **➕ Add**: User selection dropdown, Project multi-select, Dynamic pagination
5. **🔄 Refactor**: Proper Angular modular structure, Environment configuration

---

## 🚀 Comprehensive Improvement Plan

### Phase 1: Architecture & Infrastructure Updates

#### 1.1 Redmine API Analysis Results 🔍
**IMPORTANT FINDINGS** (Based on API Testing with current key `cfdcc03184edf6acafb3ec7fd5196fc3b044ca0c`):

✅ **Single API Key Can Access Multi-User Data**:
- **Current User**: Zain Hameed (ID: 194) - API key owner
- **Cross-User Access**: ✅ Can fetch issues assigned to other users
- **Time Entries**: ✅ Can access other users' time logs using `user_id` parameter
- **Project Memberships**: ✅ Can fetch all users in a project with their roles

**Key API Endpoints That Work**:
```bash
# Get current authenticated user
GET /users/current.json

# Get all projects accessible to this API key
GET /projects.json

# Get project members (shows all users in project with roles)
GET /projects/{project_id}/memberships.json

# Get issues assigned to specific user
GET /issues.json?assigned_to_id={user_id}

# Get time entries for specific user
GET /time_entries.json?user_id={user_id}

# Get issues by project
GET /issues.json?project_id={project_id}
```

**Users Endpoint Limitation**:
- ❌ `/users.json` endpoint appears restricted (returns empty/no data)
- ✅ **Workaround**: Use `/projects/{id}/memberships.json` to get project users
- ✅ Individual user data accessible through issues and time entries

**Multi-Project API Access Confirmed** ✅:

**Project Access Scope**:
- **Total Accessible Projects**: Multiple projects available via API
- **Feature Scope**: Limited to configurable whitelisted projects for productivity and time log features
- **General Viewing**: All accessible projects available for Projects tab
- **User Access**: Cross-project user data retrieval confirmed

**Technical Capabilities Verified**:
- ✅ **Cross-Project Data Access**: Single API key can access multiple projects
- ✅ **User Data Retrieval**: Issues, time entries, and user details across projects
- ✅ **Project Membership Access**: User lists available per project
- ✅ **Feature Calculations**: Time tracking and estimation data accessible for whitelisted projects

#### 1.2 Environment Configuration Overhaul
**Replace `.cursor/mcp.json` with proper environment files**:

```bash
# Backend .env file
REDMINE_HOST=https://your-redmine-host.com
REDMINE_API_KEY=your-api-key-here
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:4200

# Frontend environment files
# src/environments/environment.ts
# src/environments/environment.prod.ts
```

**Benefits**:
- ✅ Standard configuration management
- ✅ Environment-specific settings
- ✅ Security (sensitive data not in code)
- ✅ Easy deployment configuration

### Phase 2: Backend Refactoring

#### 2.1 New API Structure (Configurable Project Scope)
```javascript
// Updated endpoints based on requirements:
GET /api/projects                           // List all accessible projects (for Projects tab)
GET /api/projects/:projectId/members        // Get project members (users)
GET /api/users/:userId/issues?project_id=X  // User's issues (filtered by configured projects)
GET /api/users/:userId/productivity?projects[]=X&projects[]=Y&from=date&to=date
GET /api/tickets/:id                        // Keep existing (any project)

// Note: Whitelisted projects configured via constants file - no separate API needed
```

**Project Configuration File** (`backend/config/projects.js`):
```javascript
// Configure which projects to enable for productivity and time log features
const WHITELISTED_PROJECTS = [
  {
    id: 18,
    name: 'Rolustech',
    key: 'ROLUSTECH'
  },
  {
    id: 944,
    name: 'Panavid Fixed Cost Projects',
    key: 'PANAVID'
  }
];

// Helper functions
const getWhitelistedProjectIds = () => WHITELISTED_PROJECTS.map(p => p.id);
const getWhitelistedProjectNames = () => WHITELISTED_PROJECTS.map(p => p.name);

// Export for use across backend
module.exports = { 
  WHITELISTED_PROJECTS,
  getWhitelistedProjectIds,
  getWhitelistedProjectNames
};
```

**Frontend Constants File** (`src/app/core/constants/projects.constants.ts`):
```typescript
// Configure which projects to enable for productivity and time log features
export const WHITELISTED_PROJECTS = [
  {
    id: 18,
    name: 'Rolustech',
    key: 'ROLUSTECH'
  },
  {
    id: 944,
    name: 'Panavid Fixed Cost Projects',
    key: 'PANAVID'
  }
] as const;

// Helper functions for dynamic usage
export const getWhitelistedProjectIds = (): number[] => {
  return WHITELISTED_PROJECTS.map(p => p.id);
};

export const getWhitelistedProjectNames = (): string[] => {
  return WHITELISTED_PROJECTS.map(p => p.name);
};

export const getWhitelistedProjectByKey = (key: string) => {
  return WHITELISTED_PROJECTS.find(p => p.key === key);
};

// Usage in components - no API call needed
export const isWhitelistedProject = (projectId: number): boolean => {
  return getWhitelistedProjectIds().includes(projectId);
};
```

**Frontend Implementation**:
```typescript
// In productivity component
import { WHITELISTED_PROJECTS, getWhitelistedProjectIds } from './core/constants/projects.constants';

// Direct usage - no API call needed
const whitelistedProjects = WHITELISTED_PROJECTS;
const projectIds = getWhitelistedProjectIds();

// Filter users and data based on these whitelisted projects
```

#### 2.2 Single API Key Multi-User Support
- **User Discovery**: Fetch users via project memberships endpoint
- **Single API Key**: Use one API key to access all user data across projects
- **User Filtering**: Filter data by user_id parameter in API calls
- **Project-Based Users**: Get available users from project memberships
- **Feature Metrics**: Calculate based on selected user and whitelisted projects using time_entries API

#### 2.3 Improved Error Handling & Validation
- Input validation middleware
- Standardized error responses
- Logging system
- Rate limiting

### Phase 3: Frontend Modular Architecture with Lazy Loading

#### 3.1 New Module Structure (Lazy-Loaded)
```
src/app/
├── core/                     # Singleton services, guards (eagerly loaded)
│   ├── services/
│   │   ├── redmine-api.service.ts
│   │   ├── user.service.ts
│   │   └── config.service.ts
│   ├── constants/
│   │   └── projects.constants.ts
│   └── core.module.ts
├── shared/                   # Reusable components (imported as needed)
│   ├── components/
│   │   ├── pagination/
│   │   ├── data-table/
│   │   ├── loading-spinner/
│   │   └── user-selector/
│   ├── pipes/
│   └── shared.module.ts
├── features/                 # Feature modules (lazy-loaded)
│   ├── projects/
│   │   ├── components/
│   │   │   ├── projects-list/
│   │   │   └── project-detail/
│   │   ├── services/
│   │   │   └── projects.service.ts
│   │   ├── projects-routing.module.ts  # Lazy routing
│   │   └── projects.module.ts
│   ├── productivity/
│   │   ├── components/
│   │   │   ├── productivity-dashboard/
│   │   │   ├── user-selector/
│   │   │   └── project-selector/
│   │   ├── services/
│   │   │   └── productivity.service.ts
│   │   ├── productivity-routing.module.ts  # Lazy routing
│   │   └── productivity.module.ts
│   └── ticket-lookup/
│       ├── components/
│       ├── services/
│       ├── ticket-lookup-routing.module.ts
│       └── ticket-lookup.module.ts
├── app-routing.module.ts     # Main routing with lazy loading
└── app.module.ts             # Minimal root module
```

#### 3.2 Dynamic Components Implementation

**3.2.1 Reusable Pagination Component**
```typescript
@Component({
  selector: 'app-pagination',
  template: `<!-- Dynamic pagination UI -->`
})
export class PaginationComponent {
  @Input() totalItems: number;
  @Input() itemsPerPage: number;
  @Input() currentPage: number;
  @Output() pageChange = new EventEmitter<number>();
}
```

**3.2.2 Dynamic Data Table Component**
```typescript
@Component({
  selector: 'app-data-table',
  template: `<!-- Configurable table -->`
})
export class DataTableComponent {
  @Input() columns: TableColumn[];
  @Input() data: any[];
  @Input() loading: boolean;
  @Input() showPagination: boolean;
}
```

**3.2.3 User Selector Component (On-Demand Loading)**
```typescript
@Component({
  selector: 'app-user-selector',
  template: `<!-- User dropdown -->`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserSelectorComponent implements OnInit, OnDestroy {
  @Input() whitelistedProjectIds: number[] = [];
  @Output() userSelected = new EventEmitter<User>();
  
  users$ = new BehaviorSubject<User[]>([]);
  loading$ = new BehaviorSubject<boolean>(false);
  private destroy$ = new Subject<void>();

  constructor(private redmineService: RedmineService) {}

  ngOnInit() {
    // Only load users when component initializes and projects are provided
    if (this.whitelistedProjectIds.length > 0) {
      this.loadUsersFromProjects();
    }
  }

  private loadUsersFromProjects() {
    this.loading$.next(true);
    
    // Load users only from whitelisted projects
    const userRequests = this.whitelistedProjectIds.map(projectId =>
      this.redmineService.getProjectMembers(projectId)
    );

    forkJoin(userRequests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (projectUsers) => {
          const allUsers = projectUsers.flat();
          const uniqueUsers = this.removeDuplicateUsers(allUsers);
          this.users$.next(uniqueUsers);
          this.loading$.next(false);
        },
        error: () => this.loading$.next(false)
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

#### 3.3 Smart vs Presentation Components Pattern

**Smart Components** (Container components):
- Handle business logic
- Manage state
- Make API calls
- Pass data to presentation components

**Presentation Components** (Pure components):
- Receive data via @Input()
- Emit events via @Output()
- Focus on UI rendering
- Reusable across features

### Phase 4: New Feature Implementation

#### 4.1 User Selection System (Lazy Loading Approach)
```typescript
// Optimized user selection flow:
1. Component loads with empty user list
2. On component init or project selection:
   - Load users only from whitelisted projects (on-demand)
   - Cache users to avoid repeated API calls
3. When user selected:
   - Update only relevant components (OnPush strategy)
   - Load user-specific data only for active tab
   - Clear cached data for previous user
4. Component destruction:
   - Unsubscribe from observables
   - Clear component-specific cache
```

**Lazy Data Loading Strategy**:
```typescript
// productivity.component.ts
export class ProductivityComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  ngOnInit() {
    // Only load initial data - no heavy operations
    this.initializeComponent();
  }

  onTabActivated() {
    // Load data only when tab becomes active
    if (!this.dataLoaded) {
      this.loadProductivityData();
    }
  }

  onUserSelected(user: User) {
    // Load user-specific data on-demand
    this.loadUserData(user.id);
  }

  private loadUserData(userId: number) {
    // Cancel previous requests
    this.destroy$.next();
    
    // Load only necessary data for selected user
    this.loadUserIssues(userId);
    this.loadUserTimeEntries(userId);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

#### 4.2 Project Multi-Selection
```typescript
// Project selection for productivity:
1. Display projects as multi-select checkboxes
2. When projects selected:
   - Filter productivity data
   - Update charts/tables
   - Maintain selection state
```

#### 4.3 New Tab Structure
**Tab 1: Projects** (Lazy-Loaded, All Accessible Projects)
- **Lazy Loading**: Module loads only when tab is accessed
- **On-Demand Data**: Projects fetched only when component initializes
- Search/filter functionality with debounced input
- Project details loaded on-demand when clicked
- Clean, card-based layout with virtual scrolling for large lists
- **Caching**: Projects cached after first load

**Tab 2: Productivity** (Lazy-Loaded, Whitelisted Projects Only)
- **Lazy Loading**: Module loads only when tab is accessed
- **Smart Loading**: Users loaded only from whitelisted projects
- **Conditional Data**: Productivity data fetched only when user and projects selected
- Project multi-select with instant filtering
- Date range selector with debounced API calls
- **OnPush Strategy**: Components update only when data changes
- **Memory Management**: Previous user data cleared when switching users

### Phase 5: Enhanced UI/UX

#### 5.1 Modern Material Design
- Consistent spacing and typography
- Proper color scheme
- Responsive design
- Loading states
- Error handling UI
- Empty states

#### 5.2 Performance Optimizations & Lazy Loading Strategy

**Lazy Loading Implementation**:
```typescript
// app-routing.module.ts
const routes: Routes = [
  { path: '', redirectTo: '/projects', pathMatch: 'full' },
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
  }
];
```

**Component Loading Strategies**:
- **Eager Loading**: Core services, shared components, constants
- **Lazy Loading**: Feature modules (Projects, Productivity, Ticket Lookup)
- **On-Demand Loading**: Data fetching only when component activates
- **Conditional Loading**: Components load only when tab/route is accessed

**Additional Optimizations**:
- OnPush change detection strategy
- Virtual scrolling for large data lists
- HTTP caching with interceptors
- Debounced search inputs
- Component destruction cleanup (unsubscribe observables)

### Phase 6: State Management

#### 6.1 Simple State Management (NgRx or Akita)
```typescript
// Application state structure:
interface AppState {
  user: {
    selectedUser: User | null;
    availableUsers: User[];
  };
  projects: {
    userProjects: Project[];
    selectedProjects: number[];
    loading: boolean;
  };
  productivity: {
    data: ProductivityData[];
    dateRange: DateRange;
    loading: boolean;
  };
}
```

---

## ✅ Implementation Checklist

### Foundation & Setup
- [ ] Create environment configuration (.env files)
- [ ] Set up project constants files (whitelisted projects)
- [ ] Create new modular Angular structure with lazy loading
- [ ] Implement core services and shared components

### Backend Refactoring
- [ ] Update API endpoints to support multi-user access
- [ ] Implement project filtering based on whitelisted projects
- [ ] Add user discovery via project memberships
- [ ] Create productivity calculation endpoints
- [ ] Remove time logging endpoints (not needed)
- [ ] Add proper error handling and validation

### Frontend Architecture
- [ ] Create lazy-loaded feature modules (Projects, Productivity, Ticket Lookup)
- [ ] Implement shared components (pagination, data table, user selector)
- [ ] Set up proper routing with lazy loading
- [ ] Add OnPush change detection strategy
- [ ] Implement proper component lifecycle management

### Feature Implementation
- [ ] **Projects Tab**: List all accessible projects with search/filter
- [ ] **Productivity Tab**: User selector + project multi-select + metrics
- [ ] **Ticket Lookup**: Search functionality (keep existing)
- [ ] Remove assigned tasks tab and time log tab
- [ ] Implement dynamic user selection from whitelisted projects

### UI/UX & Performance
- [ ] Implement Material Design components
- [ ] Add loading states and error handling
- [ ] Set up virtual scrolling for large lists
- [ ] Add debounced search inputs
- [ ] Implement caching strategies
- [ ] Add responsive design

### Testing & Deployment
- [ ] Add component unit tests
- [ ] Test lazy loading functionality
- [ ] Verify multi-user data access
- [ ] Test productivity calculations
- [ ] Set up deployment configuration
- [ ] Create production build

---

## 🔧 Technical Specifications

### API Endpoints Design (Configurable Project Scope)
```typescript
// Updated API structure with configurable project limitations
interface APIEndpoints {
  projects: {
    list: 'GET /api/projects';                    // All accessible projects (Projects tab)
    members: 'GET /api/projects/:id/members';     // Users in specific project
    details: 'GET /api/projects/:id';             // Project details
  };
  users: {
    issues: 'GET /api/users/:userId/issues?project_id=X'; // Limited to configured projects
    productivity: 'GET /api/users/:userId/productivity?projects[]=X&projects[]=Y&from=date&to=date';
    timeEntries: 'GET /api/users/:userId/time-entries?project_id=X&from=date&to=date';
  };
  tickets: {
    details: 'GET /api/tickets/:id';              // Ticket details (any project)
    timeEntries: 'GET /api/tickets/:id/time-entries'; // Ticket time logs
  };
}

// Dynamic Project Configuration (easily modifiable)
const WHITELISTED_PROJECTS = [
  { 
    id: 18, 
    name: 'Rolustech',
    key: 'ROLUSTECH'
  },
  { 
    id: 944, 
    name: 'Panavid Fixed Cost Projects',
    key: 'PANAVID'
  }
];
```

### Component Hierarchy
```
AppComponent
├── HeaderComponent
│   └── UserSelectorComponent
├── TabsComponent
│   ├── ProjectsTabComponent
│   │   ├── ProjectListComponent
│   │   └── PaginationComponent
│   └── ProductivityTabComponent
│       ├── ProjectMultiSelectComponent
│       ├── DateRangeSelectorComponent
│       ├── ProductivityTableComponent
│       └── PaginationComponent
└── TicketLookupComponent
    └── TicketDetailsComponent
```

### Data Models (Based on Redmine API Response)
```typescript
interface User {
  id: number;
  name: string;           // Full name from Redmine
  login?: string;         // Username (if available)
  roles?: string[];       // User roles in project
}

interface Project {
  id: number;
  name: string;
  identifier: string;     // Project identifier
  description?: string;
  status: number;         // 1 = active
  is_public: boolean;
  created_on: string;
  updated_on: string;
}

interface Issue {
  id: number;
  subject: string;
  project: {
    id: number;
    name: string;
  };
  assigned_to?: {
    id: number;
    name: string;
  };
  estimated_hours: number | null;
  status: {
    id: number;
    name: string;
  };
  tracker: {
    id: number;
    name: string;
  };
}

interface TimeEntry {
  id: number;
  project: {
    id: number;
    name: string;
  };
  issue: {
    id: number;
  };
  user: {
    id: number;
    name: string;
  };
  hours: number;
  comments: string;
  spent_on: string;       // Date in YYYY-MM-DD format
}

interface ProductivityData {
  ticketId: number;
  subject: string;
  estimatedHours: number | null;
  actualHours: number;
  productivity: number | null;
  project: Project;
  user: User;
}
```

---

## 🎯 Success Metrics

### Performance Goals
- [ ] Page load time < 2 seconds
- [ ] API response time < 500ms
- [ ] Bundle size < 2MB
- [ ] Lighthouse score > 90

### User Experience Goals
- [ ] Intuitive user selection
- [ ] Responsive design (mobile-friendly)
- [ ] Consistent loading states
- [ ] Proper error handling

### Code Quality Goals
- [ ] Test coverage > 80%
- [ ] TypeScript strict mode
- [ ] ESLint/Prettier configuration
- [ ] Component reusability > 70%
- [ ] Work with existing Angular v15 and Node.js (no upgrades needed)

---

## 🚀 Deployment Strategy

### Development Environment
```bash
# Backend
cd backend && npm install && npm run dev

# Frontend  
cd frontend && npm install && ng serve
```

### Staging/Production Environment
```bash
# Environment variables
REDMINE_HOST=https://redmine.rolustech.com
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://your-domain.com/api
NODE_ENV=production
```

### Same Server Deployment Options
1. **Nginx Reverse Proxy**: Frontend served statically, API proxied to backend
2. **Express Static**: Backend serves both API and static frontend files
3. **Docker Compose**: Containerized deployment with nginx

---

## 📝 Notes & Considerations

### Current Limitations to Address
- Hardcoded user ID (194) in productivity calculations
- Single API key limitation
- No proper error handling for API failures
- No loading states for better UX
- No responsive design considerations

### Future Enhancements (Post-MVP)
- Real-time updates using WebSockets
- Advanced filtering and sorting
- Data export functionality
- Dashboard analytics
- User preferences storage
- Caching strategies
- PWA capabilities

### Security Considerations
- API key management
- Input validation
- XSS protection
- CORS configuration
- Environment variable security

---

## 🎉 Expected Outcomes

After implementing this improvement plan:

✅ **Modular Architecture**: Clean, maintainable, and scalable codebase  
✅ **Single API Key Multi-User Access**: Use one API key to fetch data for all project users  
✅ **User-Specific Data**: Dynamic user selection with personalized productivity data  
✅ **Streamlined Features**: Only essential functionality (Projects & Productivity)  
✅ **Reusable Components**: Dynamic pagination and data display components  
✅ **Environment Configuration**: Proper .env file management  
✅ **Enhanced UX**: Better loading states, error handling, and responsive design  
✅ **Deployment Ready**: Flexible configuration for different environments  
✅ **Current Stack**: No upgrades needed - work with existing Angular v15 and Node.js  

## 🔑 Key Implementation Insights

Based on API testing, here's the **simplified approach**:

### User Selection Strategy
1. **Get Users from Project Memberships**: Instead of a global users list, fetch users from project memberships
2. **Project-Scoped User Selection**: Show users only for projects they're part of
3. **Single API Key**: Use configured API key for all operations
4. **Dynamic Filtering**: Filter issues and time entries by `user_id` parameter

### Feature Calculation Flow (Constants-Based Configuration)
```typescript
// 1. Load whitelisted projects: Use WHITELISTED_PROJECTS constants (no API call needed)
// 2. Get members from whitelisted projects: 
//    - GET /projects/{PROJECT_ID_1}/memberships.json
//    - GET /projects/{PROJECT_ID_2}/memberships.json
// 3. User selects a user from dropdown (users from whitelisted projects only)
// 4. User selects projects (multi-select from whitelisted projects)
// 5. Fetch time entries: GET /time_entries.json?user_id=X&project_id=Y&from=date&to=date
// 6. Fetch issues: GET /issues.json?assigned_to_id=X&project_id=Y
// 7. Calculate productivity: estimated_hours / actual_hours * 100
```

**Dynamic Project Selection Options**:
- ☑️ Individual project selection (based on whitelisted projects)
- ☑️ Multiple project selection (any combination of whitelisted projects)
- ☑️ All whitelisted projects (combined analysis)

### Technical Implementation Flow:
```typescript
interface ProductivityCalculation {
  userId: number;
  projectIds: number[];
  dateRange: { from: string; to: string };
  
  // Current basic calculation
  totalEstimatedHours: number;
  totalActualHours: number;
  productivityScore: number; // estimated_hours / actual_hours * 100
  issueBreakdown: IssueProductivity[];
  
  // Future enhancement placeholders
  // TODO: Add more factors for comprehensive productivity calculation
  // - Code quality metrics
  // - Task complexity factors
  // - Deadline adherence
  // - Collaboration metrics
  // - etc.
}

// Current productivity calculation (basic implementation)
function calculateBasicProductivity(estimatedHours: number, actualHours: number): number {
  if (!estimatedHours || !actualHours) return 0;
  return Math.round((estimatedHours / actualHours) * 100);
}

// Future: Enhanced productivity calculation with multiple factors
// function calculateEnhancedProductivity(factors: ProductivityFactors): number {
//   // Will be implemented later with additional metrics
// }
```

This approach is **simpler and more reliable** than the original multi-API-key concept, and aligns perfectly with Redmine's permission system.

---

This refactored application will be production-ready, maintainable, and aligned with modern Angular best practices while meeting all specified requirements.
