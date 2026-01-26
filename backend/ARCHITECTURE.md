# Backend Architecture

This document describes the modular architecture of the Redmine MCP Dashboard backend.

## 📁 Project Structure

```
backend/
├── index.js                          # Entry point - Server setup & route registration
├── config/                           # Configuration files
│   ├── projects.js                   # Project whitelist configuration
│   ├── environment.js                # Environment variables & validation
│   └── constants.js                  # Application constants
├── routes/                           # Route definitions
│   ├── index.js                      # Route aggregator
│   ├── projects.routes.js            # /api/projects
│   ├── users.routes.js               # /api/users
│   ├── productivity.routes.js        # /api/productivity & /api/productivity/export
│   ├── tickets.routes.js             # /api/tickets & /api/assigned-tasks
│   └── health.routes.js              # /api/health
├── controllers/                      # Business logic handlers
│   ├── projects.controller.js        # Projects endpoint logic
│   ├── users.controller.js           # Users endpoint logic
│   ├── productivity.controller.js    # Productivity endpoint logic
│   ├── tickets.controller.js         # Tickets endpoint logic
│   └── health.controller.js          # Health check logic
├── services/                         # Core business services
│   ├── redmine.service.js            # Redmine API interactions
│   └── productivity.service.js       # Productivity calculations
└── helpers/                          # Utility functions
    ├── csv.helper.js                 # CSV generation utilities
    └── date.helper.js                # Date parsing utilities
```

## 🏗️ Architecture Layers

### 1. **Entry Point** (`index.js`)
- Initializes Express application
- Validates environment variables
- Configures middleware (CORS, JSON parsing)
- Registers API routes
- Starts the server

### 2. **Configuration Layer** (`config/`)
- **environment.js**: Environment variable management and validation
- **projects.js**: Whitelisted projects configuration
- **constants.js**: Application-level constants (limits, keywords, etc.)

### 3. **Routes Layer** (`routes/`)
- Defines HTTP endpoints
- Maps URLs to controller methods
- Uses Express Router for modularity
- Aggregated in `routes/index.js`

### 4. **Controllers Layer** (`controllers/`)
- Handles HTTP request/response logic
- Validates request parameters
- Calls services for business logic
- Formats responses

### 5. **Services Layer** (`services/`)
- **redmine.service.js**: All Redmine API calls with axios
- **productivity.service.js**: Productivity calculation logic

### 6. **Helpers Layer** (`helpers/`)
- **csv.helper.js**: CSV generation and formatting
- **date.helper.js**: Date parsing and utilities

## 🔄 Request Flow

```
Client Request
    ↓
index.js (Express App)
    ↓
routes/index.js (Route Aggregator)
    ↓
routes/[resource].routes.js (Route Definition)
    ↓
controllers/[resource].controller.js (Request Handler)
    ↓
services/[service].service.js (Business Logic)
    ↓
helpers/[helper].helper.js (Utilities)
    ↓
Response to Client
```

## 📝 Example: Productivity Calculation Flow

1. **Request**: `GET /api/productivity?user_id=1300&project_ids=944&from_date=2025-09-01&to_date=2025-09-30`
2. **Route**: `routes/productivity.routes.js` → `GET /`
3. **Controller**: `productivity.controller.js` → `getProductivity()`
4. **Service**: `redmine.service.js` → `getTimeEntriesForUser()`
5. **Service**: `productivity.service.js` → `calculateProductivity()`
6. **Response**: JSON with productivity data

## 🎯 Benefits

1. **Separation of Concerns**: Each layer has a specific responsibility
2. **Testability**: Modules can be unit tested independently
3. **Maintainability**: Easy to locate and modify specific functionality
4. **Reusability**: Services and helpers shared across controllers
5. **Scalability**: Easy to add new features without cluttering code

## 🔧 Adding New Features

### Adding a New Endpoint

1. **Create Controller**: `controllers/new-feature.controller.js`
   ```javascript
   const newFeatureController = {
     getData: async (req, res) => {
       // Logic here
     }
   };
   module.exports = newFeatureController;
   ```

2. **Create Routes**: `routes/new-feature.routes.js`
   ```javascript
   const router = express.Router();
   const controller = require('../controllers/new-feature.controller');
   router.get('/', controller.getData);
   module.exports = router;
   ```

3. **Register Route**: Update `routes/index.js`
   ```javascript
   const newFeatureRoutes = require('./new-feature.routes');
   router.use('/new-feature', newFeatureRoutes);
   ```

### Adding a New Service

Create `services/new-service.service.js`:
```javascript
const newService = {
  doSomething: async (param) => {
    // Logic here
    return result;
  }
};
module.exports = newService;
```

Then import in controllers:
```javascript
const newService = require('../services/new-service.service');
```

## 🚀 Running the Application

```bash
cd backend
npm install
node index.js
```

The server will:
1. Validate environment variables
2. Start on the configured PORT (default: 3000)
3. Log startup information

## ✅ No Logic Changes

This refactoring maintains 100% compatibility with the previous implementation:
- All API endpoints work identically
- Productivity calculations unchanged
- Same request/response formats
- Same environment variables

