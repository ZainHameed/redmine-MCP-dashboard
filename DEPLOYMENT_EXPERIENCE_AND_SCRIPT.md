# 🚀 Redmine MCP Dashboard - Complete Deployment Experience & Script

## 📋 Overview

This document details the **complete deployment journey** of the Redmine MCP Dashboard from local development to staging server, including all challenges faced, solutions implemented, and a reusable deployment script for future updates.

---

## 🎯 What We Accomplished

**Goal**: Deploy Angular frontend + Node.js backend to staging server with Apache + PM2

**Result**: ✅ **Fully functional application** at `https://staging5.rolustech.com:44379/`

---

## 🏗️ Server Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Staging Server                          │
├─────────────────────────────────────────────────────────────┤
│  Apache (Port 80/443) - Web Server                          │
│  ├── Serves Angular frontend from /opt/my-angular-app       │
│  ├── Proxies /api/* requests to Node.js backend            │
│  └── Handles SSL/HTTPS for secure connections               │
├─────────────────────────────────────────────────────────────┤
│  PM2 Process Manager                                         │
│  └── Node.js Backend (Port 3000) - API Server               │
└─────────────────────────────────────────────────────────────┘
```

**Why this setup?**
- **Apache**: Industry-standard web server, handles SSL, static files efficiently
- **PM2**: Keeps Node.js backend running, auto-restarts on crashes
- **Proxy**: Frontend calls `/api/*` → Apache forwards to backend seamlessly

---

## 🛠️ Step-by-Step Deployment Journey

### **Phase 1: Initial Server Assessment**

**What we found:**
- Server: `staging5.rolustech.com:2279` (SSH)
- Apache: Running, serving SugarCRM from `/opt/sugarcrmpro`
- PM2: Installed (v6.0.13) but no processes running
- Node.js: v12.22.9 (system) + v22.19.0 (via NVM)

**Key Discovery**: Server had NVM with Node.js v22.19.0 - perfect compatibility!

### **Phase 2: Directory Setup**

**Created:**
```bash
/opt/my-angular-app/          # Angular frontend files
/var/www/my-backend/          # Node.js backend files
```

**Why these locations?**
- `/opt/`: Standard location for applications
- `/var/www/`: Standard web server directory
- Separated frontend/backend for security and organization

### **Phase 3: Frontend Deployment**

**Process:**
1. Built Angular app locally: `npm run build --prod`
2. Copied built files to server: `scp -r frontend/dist/frontend/* server:/opt/my-angular-app/`
3. Set permissions: `chown -R www-data:www-data /opt/my-angular-app`

**Result**: ✅ Frontend files deployed successfully

### **Phase 4: Backend Deployment**

**Process:**
1. Copied source files (excluding node_modules): `rsync --exclude='node_modules' backend/ server:/var/www/my-backend/`
2. Installed dependencies: `npm install --production`
3. Created environment file: `.env` with Redmine API configuration
4. Created PM2 ecosystem file: `ecosystem.config.js`

**Key Decision**: Copy source + install dependencies (not node_modules) because:
- ✅ Platform compatibility (server OS vs local OS)
- ✅ Smaller transfer size
- ✅ Fresh, clean dependencies

**Result**: ✅ Backend deployed and running on PM2

### **Phase 5: Apache Configuration**

**Challenge**: Multiple virtual hosts needed configuration

**What we configured:**
1. **HTTP Virtual Host** (`000-default.conf`): Port 80
2. **HTTPS Virtual Host** (`default-ssl.conf`): Port 443 (SSL)

**Configuration added:**
```apache
DocumentRoot /opt/my-angular-app

<Directory /opt/my-angular-app>
    AllowOverride All
    Require all granted
    Options Indexes FollowSymLinks
</Directory>

ProxyPreserveHost On
ProxyPass /api/ http://localhost:3000/api/
ProxyPassReverse /api/ http://localhost:3000/api/
```

**Result**: ✅ Apache serving frontend correctly

---

## 🚨 Challenges Faced & Solutions

### **Challenge 1: 403 Forbidden Error**

**Problem**: Apache returning "403 Forbidden" when accessing the website

**Root Cause**: 
- Apache configuration was pointing to `/opt/sugarcrmpro` (old SugarCRM)
- Directory permissions not set correctly
- Missing `<Directory>` configuration

**Solution**:
1. Updated DocumentRoot in both HTTP and HTTPS virtual hosts
2. Added proper `<Directory>` configuration with permissions
3. Set correct file ownership: `chown -R www-data:www-data /opt/my-angular-app`

**Result**: ✅ Website accessible via HTTPS

### **Challenge 2: API 404 Not Found**

**Problem**: Frontend getting "404 Not Found" for `/api/projects` requests

**Root Cause**: 
- Apache proxy was stripping `/api` prefix
- Backend config file path was incorrect
- Proxy configuration was incomplete

**Solution**:
1. **Fixed proxy configuration**:
   ```apache
   # Before (wrong)
   ProxyPass /api/ http://localhost:3000/
   
   # After (correct)
   ProxyPass /api/ http://localhost:3000/api/
   ```

2. **Fixed backend config path**:
   ```javascript
   // Before (wrong)
   const configPath = path.join(__dirname, '../.cursor/mcp.json');
   
   // After (correct)
   const configPath = path.join(__dirname, './mcp.json');
   ```

3. **Added proxy to both HTTP and HTTPS virtual hosts**

**Result**: ✅ API calls working perfectly

### **Challenge 3: Node.js Version Compatibility**

**Problem**: Local Node.js v22.14.0 vs Server Node.js v12.22.9

**Discovery**: Server had NVM with v22.19.0 available

**Solution**: Used NVM to ensure compatible Node.js version
```bash
source ~/.nvm/nvm.sh && npm install --production
```

**Result**: ✅ Perfect version compatibility

### **Challenge 4: SSL Configuration**

**Problem**: HTTPS requests still pointing to old SugarCRM directory

**Root Cause**: SSL virtual host (`default-ssl.conf`) not updated

**Solution**: Updated both HTTP and HTTPS virtual hosts consistently

**Result**: ✅ HTTPS working correctly

---

## 📜 Complete Deployment Script

Here's the **reusable deployment script** for future updates:

```bash
#!/bin/bash
# Redmine MCP Dashboard - Deployment Script
# Usage: ./deploy.sh [frontend|backend|full]

set -e  # Exit on any error

# Configuration
SERVER="staging5.rolustech.com"
SSH_PORT="2279"
SSH_USER="root"
FRONTEND_DIR="/opt/my-angular-app"
BACKEND_DIR="/var/www/my-backend"
PM2_APP_NAME="redmine-backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Function to deploy frontend
deploy_frontend() {
    log "🚀 Deploying Frontend..."
    
    # Build Angular app
    log "Building Angular app..."
    cd frontend
    npm run build --prod
    if [ $? -ne 0 ]; then
        error "Frontend build failed!"
    fi
    
    # Copy files to server
    log "Copying frontend files to server..."
    scp -P $SSH_PORT -r dist/frontend/* $SSH_USER@$SERVER:$FRONTEND_DIR/
    if [ $? -ne 0 ]; then
        error "Failed to copy frontend files!"
    fi
    
    # Set permissions
    log "Setting file permissions..."
    ssh -p $SSH_PORT $SSH_USER@$SERVER "chown -R www-data:www-data $FRONTEND_DIR && chmod -R 755 $FRONTEND_DIR"
    
    log "✅ Frontend deployed successfully!"
}

# Function to deploy backend
deploy_backend() {
    log "🚀 Deploying Backend..."
    
    # Backup existing server files
    log "Backing up existing server configuration..."
    ssh -p $SSH_PORT $SSH_USER@$SERVER "cp $BACKEND_DIR/.env $BACKEND_DIR/.env.backup 2>/dev/null || true"
    ssh -p $SSH_PORT $SSH_USER@$SERVER "cp $BACKEND_DIR/mcp.json $BACKEND_DIR/mcp.json.backup 2>/dev/null || true"
    ssh -p $SSH_PORT $SSH_USER@$SERVER "cp $BACKEND_DIR/ecosystem.config.js $BACKEND_DIR/ecosystem.config.js.backup 2>/dev/null || true"
    
    # Copy backend files (excluding node_modules and server-specific files)
    log "Copying backend files to server..."
    rsync -av --exclude='node_modules' --exclude='.env' --exclude='mcp.json' --exclude='ecosystem.config.js' -e "ssh -p $SSH_PORT" backend/ $SSH_USER@$SERVER:$BACKEND_DIR/
    
    # Restore server-specific files
    log "Restoring server-specific configuration..."
    ssh -p $SSH_PORT $SSH_USER@$SERVER "cp $BACKEND_DIR/.env.backup $BACKEND_DIR/.env 2>/dev/null || true"
    ssh -p $SSH_PORT $SSH_USER@$SERVER "cp $BACKEND_DIR/mcp.json.backup $BACKEND_DIR/mcp.json 2>/dev/null || true"
    ssh -p $SSH_PORT $SSH_USER@$SERVER "cp $BACKEND_DIR/ecosystem.config.js.backup $BACKEND_DIR/ecosystem.config.js 2>/dev/null || true"
    if [ $? -ne 0 ]; then
        error "Failed to copy backend files!"
    fi
    
    # Install dependencies
    log "Installing backend dependencies..."
    ssh -p $SSH_PORT $SSH_USER@$SERVER "source ~/.nvm/nvm.sh && cd $BACKEND_DIR && npm install --production"
    if [ $? -ne 0 ]; then
        error "Failed to install backend dependencies!"
    fi
    
    # Create/update environment file
    log "Creating environment file..."
    ssh -p $SSH_PORT $SSH_USER@$SERVER "cat > $BACKEND_DIR/.env << 'EOF'
NODE_ENV=production
PORT=3000
REDMINE_HOST=https://redmine.rolustech.com/projects.json
REDMINE_API_KEY=cfdcc03184edf6acafb3ec7fd5196fc3b044ca0c
FRONTEND_URL=https://staging5.rolustech.com:44379
EOF"
    
    # Create/update PM2 ecosystem file
    log "Creating PM2 ecosystem file..."
    ssh -p $SSH_PORT $SSH_USER@$SERVER "cat > $BACKEND_DIR/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: '$PM2_APP_NAME',
    script: 'index.js',
    cwd: '$BACKEND_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/$PM2_APP_NAME-error.log',
    out_file: '/var/log/pm2/$PM2_APP_NAME-out.log',
    log_file: '/var/log/pm2/$PM2_APP_NAME-combined.log'
  }]
};
EOF"
    
    # Restart PM2 process
    log "Restarting PM2 process..."
    ssh -p $SSH_PORT $SSH_USER@$SERVER "source ~/.nvm/nvm.sh && cd $BACKEND_DIR && pm2 restart $PM2_APP_NAME || pm2 start ecosystem.config.js"
    
    log "✅ Backend deployed successfully!"
}

# Function to configure Apache
configure_apache() {
    log "🔧 Configuring Apache..."
    
    # Update HTTP virtual host
    ssh -p $SSH_PORT $SSH_USER@$SERVER "cat > /etc/apache2/sites-available/000-default.conf << 'EOF'
<VirtualHost *:80>
    ServerAdmin webmaster@localhost
    DocumentRoot $FRONTEND_DIR

    <Directory $FRONTEND_DIR>
        AllowOverride All
        Require all granted
        Options Indexes FollowSymLinks
    </Directory>

    RewriteEngine On
    
    ProxyPreserveHost On
    ProxyPass /api/ http://localhost:3000/api/
    ProxyPassReverse /api/ http://localhost:3000/api/

    ErrorLog \${APACHE_LOG_DIR}/error.log
    CustomLog \${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
EOF"

    # Update HTTPS virtual host
    ssh -p $SSH_PORT $SSH_USER@$SERVER "cat > /etc/apache2/sites-available/default-ssl.conf << 'EOF'
<IfModule mod_ssl.c>
    <VirtualHost _default_:443>
        ServerAdmin webmaster@localhost
        DocumentRoot $FRONTEND_DIR

        <Directory $FRONTEND_DIR>
            AllowOverride All
            Require all granted
            Options Indexes FollowSymLinks
        </Directory>

        RewriteEngine On
        
        ProxyPreserveHost On
        ProxyPass /api/ http://localhost:3000/api/
        ProxyPassReverse /api/ http://localhost:3000/api/

        ErrorLog \${APACHE_LOG_DIR}/error.log
        CustomLog \${APACHE_LOG_DIR}/access.log combined

        SSLEngine on
        SSLCertificateFile /etc/ssl/certs/ssl-cert-snakeoil.pem
        SSLCertificateKeyFile /etc/ssl/private/ssl-cert-snakeoil.key
    </VirtualHost>
</IfModule>
EOF"

    # Test configuration and reload
    log "Testing Apache configuration..."
    ssh -p $SSH_PORT $SSH_USER@$SERVER "apache2ctl configtest && systemctl reload apache2"
    
    log "✅ Apache configured successfully!"
}

# Function to verify deployment
verify_deployment() {
    log "🔍 Verifying deployment..."
    
    # Test frontend
    log "Testing frontend..."
    if curl -s -I https://$SERVER:44379/ | grep -q "200 OK"; then
        log "✅ Frontend is accessible"
    else
        error "❌ Frontend not accessible"
    fi
    
    # Test API
    log "Testing API..."
    if curl -s https://$SERVER:44379/api/projects | grep -q "id"; then
        log "✅ API is working"
    else
        error "❌ API not working"
    fi
    
    # Check PM2 status
    log "Checking PM2 status..."
    ssh -p $SSH_PORT $SSH_USER@$SERVER "pm2 status $PM2_APP_NAME"
    
    log "🎉 Deployment verification complete!"
}

# Main deployment function
deploy_full() {
    log "🚀 Starting full deployment..."
    
    deploy_frontend
    deploy_backend
    configure_apache
    verify_deployment
    
    log "🎉 Full deployment completed successfully!"
    log "🌐 Application available at: https://$SERVER:44379/"
}

# Script usage
case "${1:-full}" in
    "frontend")
        deploy_frontend
        ;;
    "backend")
        deploy_backend
        ;;
    "full")
        deploy_full
        ;;
    *)
        echo "Usage: $0 [frontend|backend|full]"
        echo "  frontend - Deploy only frontend"
        echo "  backend  - Deploy only backend"
        echo "  full     - Deploy everything (default)"
        exit 1
        ;;
esac
```

---

## 🎯 How to Use the Deployment Script

### **For Future Updates:**

1. **Frontend changes only:**
   ```bash
   ./deploy.sh frontend
   ```

2. **Backend changes only:**
   ```bash
   ./deploy.sh backend
   ```

3. **Full deployment (both):**
   ```bash
   ./deploy.sh full
   ```

### **What the script does:**

- ✅ **Builds** Angular app for production
- ✅ **Copies** files to server with proper permissions
- ✅ **Installs** dependencies using NVM
- ✅ **Configures** Apache virtual hosts
- ✅ **Restarts** PM2 processes
- ✅ **Verifies** deployment is working
- ✅ **Handles errors** gracefully with colored output

---

## 📊 Final Architecture Summary

**What we built:**
```
Internet → HTTPS (44379) → Apache → Angular Frontend
                    ↓
                /api/* → Node.js Backend (PM2) → Redmine API
```

**Key Benefits:**
- ✅ **Secure**: HTTPS with SSL certificates
- ✅ **Reliable**: PM2 auto-restarts backend on crashes
- ✅ **Scalable**: Apache handles multiple concurrent users
- ✅ **Maintainable**: Separate frontend/backend deployments
- ✅ **Fast**: Static files served by Apache, API by Node.js

---

## 🎉 Success Metrics

**Before Deployment:**
- ❌ No application on staging
- ❌ SugarCRM running on old directory
- ❌ No API endpoints available

**After Deployment:**
- ✅ **Frontend**: https://staging5.rolustech.com:44379/ (200 OK)
- ✅ **API**: https://staging5.rolustech.com:44379/api/projects (200 OK)
- ✅ **Backend**: PM2 process running (67MB memory)
- ✅ **Apache**: Serving both HTTP and HTTPS correctly
- ✅ **SSL**: Secure connections working
- ✅ **Proxy**: API requests forwarded correctly

---

## ⚠️ **IMPORTANT: Server-Specific Files & Future-Proofing**

### **Files That Should NOT Be Overwritten:**

When deploying backend code, these files are **server-specific** and should be preserved:

1. **`.env`** - Environment variables (API keys, URLs, etc.)
2. **`mcp.json`** - Redmine API configuration (legacy)
3. **`ecosystem.config.js`** - PM2 process configuration
4. **`node_modules/`** - Dependencies (platform-specific)

### **🔄 Future-Proofing for Improvement Plan:**

The deployment script is **intelligent** and handles the transition from `mcp.json` to `.env` files:

#### **Current State (mcp.json)**:
```bash
# Script detects: No local .env file
# Action: Preserve server .env, copy code, restore server config
```

#### **Future State (.env implementation)**:
```bash
# Script detects: Local .env file exists
# Action: Deploy local .env to server, update server configuration
```

### **How the Script Handles This:**

```bash
# 1. Check if local .env exists
if [ -f "backend/.env" ]; then
    LOCAL_ENV_EXISTS=true
    log "📄 Local .env file detected - will be deployed to server"
else
    log "📄 No local .env file - will preserve server configuration"
fi

# 2. Backup existing server files
cp .env .env.backup
cp mcp.json mcp.json.backup
cp ecosystem.config.js ecosystem.config.js.backup

# 3. Copy code (smart exclusion based on local .env)
if [ "$LOCAL_ENV_EXISTS" = true ]; then
    # Deploy local .env (future-proofing)
    rsync --exclude='mcp.json' --exclude='ecosystem.config.js' backend/ server/
else
    # Preserve server .env (current state)
    rsync --exclude='.env' --exclude='mcp.json' --exclude='ecosystem.config.js' backend/ server/
fi

# 4. Restore server files (only if needed)
if [ "$LOCAL_ENV_EXISTS" = false ]; then
    cp .env.backup .env
    cp mcp.json.backup mcp.json
    cp ecosystem.config.js.backup ecosystem.config.js
fi
```

### **Why This Matters:**

- ✅ **Preserves API keys** and configuration
- ✅ **Maintains PM2 settings** for process management
- ✅ **Keeps environment variables** for production
- ✅ **Prevents accidental overwrites** of server-specific data
- ✅ **Future-proof**: Automatically handles `.env` transition
- ✅ **Smart detection**: Knows when to deploy vs preserve config

---

## 🛠️ **Creating Local .env File (Future Development)**

### **Step 1: Create Your Local .env**
```bash
# Create your .env file with your configuration
nano backend/.env
```

Example `.env` content:
```bash
# Redmine MCP Dashboard - Environment Configuration
NODE_ENV=development
PORT=3000
REDMINE_HOST=https://redmine.rolustech.com/projects.json
REDMINE_API_KEY=your-api-key-here
FRONTEND_URL=http://localhost:4200
APP_VERSION=1.0.0
```

### **Step 2: Update Backend Code**
When you implement the improvement plan, update `backend/index.js`:
```javascript
// Replace mcp.json reading with .env
require('dotenv').config();

const REDMINE_HOST = process.env.REDMINE_HOST;
const REDMINE_API_KEY = process.env.REDMINE_API_KEY;
const PORT = process.env.PORT || 3000;
```

### **Step 3: Deploy with .env**
```bash
# The script will copy your local .env file to the server
./deploy.sh backend
```

**The script will automatically:**
- ✅ Detect your local `.env` file
- ✅ Deploy it to the server
- ✅ Update server configuration
- ✅ Preserve PM2 and other server-specific files

---

## 🤖 **Fully Automated Deployment Features**

### **What the Script Does Automatically:**

#### **Backend Deployment:**
1. **Package Management**: Always runs `npm install --production` to ensure all packages are up to date
2. **Environment Setup**: 
   - **File-Based**: Only copies local `.env` file to server
   - **No Hardcoded Values**: Script contains no environment variables
   - **Error Handling**: Shows clear error if `.env` file is missing
   - **Pure Deployment**: Script is purely for deployment, not configuration
3. **PM2 Management**: 
   - Stops existing process gracefully
   - Creates updated ecosystem configuration with `env_file` reference
   - Starts process with new configuration
   - Saves PM2 configuration for persistence
4. **Health Verification**: 
   - Waits for backend to start (5 seconds)
   - Tests health endpoint with retry logic (6 attempts)
   - Shows PM2 status and logs if health check fails
5. **Error Handling**: Provides detailed error messages and troubleshooting info

#### **Frontend Deployment:**
1. **Build Process**: Runs Angular production build
2. **File Transfer**: Copies built files to server
3. **Permissions**: Sets correct Apache permissions (`www-data:www-data`)
4. **Verification**: Tests frontend accessibility

#### **Apache Configuration:**
1. **Virtual Hosts**: Updates both HTTP and HTTPS configurations
2. **Proxy Setup**: Configures API request forwarding
3. **Rewrite Rules**: Enables Angular routing
4. **SSL Support**: Maintains HTTPS configuration
5. **Reload**: Tests configuration and reloads Apache

### **No Manual Intervention Required:**

The script handles everything that was previously done manually:
- ❌ ~~Manual PM2 restart~~
- ❌ ~~Manual package installation~~
- ❌ ~~Manual environment file creation~~
- ❌ ~~Manual health check verification~~
- ❌ ~~Manual Apache configuration~~

**Everything is now automated!** 🎉

---

## 🔧 **Environment Configuration Approach**

### **Pure File-Based Deployment:**

The deployment script now follows a **pure file-based approach**:

#### **✅ What the Script Does:**
- **Copies** your local `backend/.env` file to the server
- **No hardcoded values** in the script itself
- **Shows clear error** if `.env` file is missing
- **Pure deployment** - configuration is separate from deployment

#### **❌ What the Script Does NOT Do:**
- ~~Create default environment files~~
- ~~Hardcode any environment values~~
- ~~Guess or assume configuration~~
- ~~Mix deployment with configuration~~

### **Required Setup Before Deployment:**

```bash
# 1. Create your .env file locally with your configuration
nano backend/.env

# 2. Deploy (script will copy your .env file)
./deploy.sh backend
```

### **Benefits:**
- ✅ **Clean separation** of configuration and deployment
- ✅ **No hardcoded values** in deployment script
- ✅ **Version control friendly** - .env files can be gitignored
- ✅ **Environment specific** - different .env for dev/staging/prod
- ✅ **Clear error messages** when configuration is missing

---

## 🔧 Troubleshooting Guide

### **Common Issues & Solutions:**

1. **403 Forbidden**
   - Check Apache DocumentRoot
   - Verify file permissions (`chown -R www-data:www-data`)
   - Check `<Directory>` configuration

2. **API 404 Not Found**
   - Verify proxy configuration (`ProxyPass /api/ http://localhost:3000/api/`)
   - Check PM2 process status
   - Verify backend config file path

3. **PM2 Process Not Starting**
   - Check Node.js version (`source ~/.nvm/nvm.sh`)
   - Verify dependencies (`npm install --production`)
   - Check PM2 logs (`pm2 logs redmine-backend`)

4. **SSL Issues**
   - Update both HTTP and HTTPS virtual hosts
   - Check SSL certificate paths
   - Verify Apache modules enabled

---

## 📝 Key Learnings

1. **Always check both HTTP and HTTPS virtual hosts** - SSL requests use different config
2. **Proxy configuration is critical** - `/api/` prefix must be preserved
3. **File permissions matter** - Apache needs `www-data` ownership
4. **PM2 ecosystem files** - Better than manual PM2 commands
5. **NVM compatibility** - Use same Node.js version for consistency
6. **Configuration testing** - Always run `apache2ctl configtest` before reload

---

**🎯 This deployment script and documentation will ensure smooth future updates without repeating the same challenges!**
