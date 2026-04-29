# Redmine MCP Dashboard

This project uses Redmine MCP server to provide a dashboard interface for managing Redmine tickets, projects, and productivity metrics.

## Prerequisites

- **Node.js** >= 18.x
- **npm** (comes with Node.js)
- **Angular CLI** 15.x (will be installed as a dev dependency)

## Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd redmine-MCP-dashboard
```

### 2. Install Root Dependencies

Install the root package dependencies (includes `concurrently` for running both servers):
```bash
npm install
```

### 3. Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
   - Copy the environment template:
   ```bash
   cp .env.template .env
   ```
   
   - Edit `.env` and set your Redmine credentials:
   ```env
   REDMINE_HOST=https://your-redmine-instance.com
   REDMINE_API_KEY=your-api-key-here
   PORT=3000
   NODE_ENV=development
   ```
   
   **Note:** `REDMINE_HOST` and `REDMINE_API_KEY` are required. The application will not start without them.

### 4. Frontend Setup

1. Navigate to the frontend directory (from project root):
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

### Quick Start (Recommended)

Run both frontend and backend servers concurrently from the project root:

```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:3000` (with auto-reload via nodemon)
- Frontend server on `http://localhost:4200` (with hot-reload)

### Individual Server Commands

#### Start Backend Server Only

From the `backend` directory:
```bash
npm start          # Production mode
npm run dev        # Development mode with auto-reload
```

The backend server will start on `http://localhost:3000` (or the port specified in your `.env` file).

#### Start Frontend Server Only

From the `frontend` directory:
```bash
npm start
```

The frontend application will start on `http://localhost:4200` and will automatically proxy API requests to the backend server.

### Access the Application

Once both servers are running, open your browser and navigate to:
```
http://localhost:4200
```

## Project Structure

- `backend/` - Express.js backend server with API routes
- `frontend/` - Angular 15 frontend application
- `backend/.env` - Environment configuration (not tracked in git)
- `backend/.env.template` - Environment template file
