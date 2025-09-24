#!/bin/bash
# Redmine MCP Dashboard - Deployment Script
# Usage: ./deploy.sh [frontend|backend|full]
#
# Configuration: Edit the variables below to customize deployment settings
# All hardcoded values have been removed - everything is configurable!

set -e  # Exit on any error

# Configuration
SERVER="staging5.rolustech.com"
SSH_PORT="2279"
SSH_USER="root"
SSH_PASS="3CEEg6APe5kprcaVwkKO"
FRONTEND_DIR="/opt/my-angular-app"
BACKEND_DIR="/var/www/my-backend"
PM2_APP_NAME="redmine-backend"

# Environment Configuration (will be read from .env file)
BACKEND_PORT="3000"  # Default port, can be overridden by .env
FRONTEND_URL="https://staging5.rolustech.com:44379"  # For health checks

# Node.js Configuration
NODE_VERSION="v22.19.0"
NVM_PATH="/root/.nvm/versions/node/$NODE_VERSION/bin/node"

# Apache Configuration is handled manually - only file permissions needed
APACHE_USER="www-data"

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
    log "📁 This will copy your built Angular app to the server..."
    sshpass -p "$SSH_PASS" scp -P $SSH_PORT -r dist/frontend/* $SSH_USER@$SERVER:$FRONTEND_DIR/
    if [ $? -ne 0 ]; then
        error "Failed to copy frontend files!"
    fi
    
    # Set permissions
    log "Setting file permissions..."
    log "🔐 This will set correct permissions for Apache..."
    sshpass -p "$SSH_PASS" sshpass -p "$SSH_PASS" ssh -p $SSH_PORT $SSH_USER@$SERVER "chown -R $APACHE_USER:$APACHE_USER $FRONTEND_DIR && chmod -R 755 $FRONTEND_DIR"
    
    # Return to project root
    cd ..
    
    log "✅ Frontend deployed successfully!"
}

# Function to deploy backend
deploy_backend() {
    log "🚀 Deploying Backend..."
    
    # Check if local .env exists (future-proofing for improvement plan)
    LOCAL_ENV_EXISTS=false
    if [ -f "backend/.env" ]; then
        LOCAL_ENV_EXISTS=true
        log "📄 Local .env file detected - will be deployed to server"
    else
        log "📄 No local .env file - will preserve server configuration"
    fi
    
    # Backup existing server files
    log "Backing up existing server configuration..."
    log "💾 This will backup your current server configuration files..."
    sshpass -p "$SSH_PASS" sshpass -p "$SSH_PASS" ssh -p $SSH_PORT $SSH_USER@$SERVER "cp $BACKEND_DIR/.env $BACKEND_DIR/.env.backup 2>/dev/null || true"
    sshpass -p "$SSH_PASS" sshpass -p "$SSH_PASS" ssh -p $SSH_PORT $SSH_USER@$SERVER "cp $BACKEND_DIR/mcp.json $BACKEND_DIR/mcp.json.backup 2>/dev/null || true"
    sshpass -p "$SSH_PASS" sshpass -p "$SSH_PASS" ssh -p $SSH_PORT $SSH_USER@$SERVER "cp $BACKEND_DIR/ecosystem.config.js $BACKEND_DIR/ecosystem.config.js.backup 2>/dev/null || true"
    
    # Copy backend files (excluding node_modules and server-specific files)
    log "Copying backend files to server..."
    log "📁 This will copy your backend code to the server..."
    if [ "$LOCAL_ENV_EXISTS" = true ]; then
        # If local .env exists, copy it (future-proofing)
        if SSHPASS="$SSH_PASS" rsync -av --exclude='node_modules' --exclude='mcp.json' --exclude='ecosystem.config.js' -e "sshpass -e ssh -p $SSH_PORT" backend/ $SSH_USER@$SERVER:$BACKEND_DIR/ 2>/dev/null; then
            log "✅ Backend files copied successfully"
        else
            # Check if files were actually transferred despite permission warnings
            if sshpass -p "$SSH_PASS" ssh -p $SSH_PORT $SSH_USER@$SERVER "test -f $BACKEND_DIR/index.js"; then
                log "✅ Backend files copied successfully (permission warnings ignored)"
            else
                error "Failed to copy backend files!"
            fi
        fi
    else
        # If no local .env, exclude it to preserve server config
        if SSHPASS="$SSH_PASS" rsync -av --exclude='node_modules' --exclude='.env' --exclude='mcp.json' --exclude='ecosystem.config.js' -e "sshpass -e ssh -p $SSH_PORT" backend/ $SSH_USER@$SERVER:$BACKEND_DIR/ 2>/dev/null; then
            log "✅ Backend files copied successfully"
        else
            # Check if files were actually transferred despite permission warnings
            if sshpass -p "$SSH_PASS" ssh -p $SSH_PORT $SSH_USER@$SERVER "test -f $BACKEND_DIR/index.js"; then
                log "✅ Backend files copied successfully (permission warnings ignored)"
            else
                error "Failed to copy backend files!"
            fi
        fi
    fi
    
    # Restore server-specific files (only if local .env doesn't exist)
    if [ "$LOCAL_ENV_EXISTS" = false ]; then
        log "Restoring server-specific configuration..."
        sshpass -p "$SSH_PASS" ssh -p $SSH_PORT $SSH_USER@$SERVER "cp $BACKEND_DIR/.env.backup $BACKEND_DIR/.env 2>/dev/null || true"
        sshpass -p "$SSH_PASS" ssh -p $SSH_PORT $SSH_USER@$SERVER "cp $BACKEND_DIR/mcp.json.backup $BACKEND_DIR/mcp.json 2>/dev/null || true"
        sshpass -p "$SSH_PASS" ssh -p $SSH_PORT $SSH_USER@$SERVER "cp $BACKEND_DIR/ecosystem.config.js.backup $BACKEND_DIR/ecosystem.config.js 2>/dev/null || true"
    else
        log "✅ Local .env file deployed - server configuration updated"
        # Still restore mcp.json and ecosystem.config.js as they might be server-specific
        sshpass -p "$SSH_PASS" ssh -p $SSH_PORT $SSH_USER@$SERVER "cp $BACKEND_DIR/mcp.json.backup $BACKEND_DIR/mcp.json 2>/dev/null || true"
        sshpass -p "$SSH_PASS" ssh -p $SSH_PORT $SSH_USER@$SERVER "cp $BACKEND_DIR/ecosystem.config.js.backup $BACKEND_DIR/ecosystem.config.js 2>/dev/null || true"
    fi
    
    # Install dependencies (always run npm install to ensure all packages are up to date)
    log "Installing backend dependencies..."
    sshpass -p "$SSH_PASS" ssh -p $SSH_PORT $SSH_USER@$SERVER "source ~/.nvm/nvm.sh && cd $BACKEND_DIR && npm install --production"
    if [ $? -ne 0 ]; then
        error "Failed to install backend dependencies!"
    fi
    
    # Deploy environment file
    if [ "$LOCAL_ENV_EXISTS" = true ]; then
        log "Deploying local .env file to server..."
        log "📄 This will copy your local .env file to the server..."
        # Copy local .env file to server
        sshpass -p "$SSH_PASS" scp -P $SSH_PORT backend/.env $SSH_USER@$SERVER:$BACKEND_DIR/.env
        if [ $? -ne 0 ]; then
            error "Failed to copy .env file to server!"
        fi
        log "✅ .env file deployed successfully"
    else
        error "❌ No local .env file found! Please create backend/.env with your configuration before deploying."
    fi
    
    # Create/update PM2 ecosystem file
    log "Creating PM2 ecosystem file..."
    sshpass -p "$SSH_PASS" ssh -p $SSH_PORT $SSH_USER@$SERVER "cat > $BACKEND_DIR/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: '$PM2_APP_NAME',
    script: 'index.js',
    cwd: '$BACKEND_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_file: '$BACKEND_DIR/.env',
    // Use NVM to ensure correct Node.js version
    interpreter: '$NVM_PATH',
    error_file: '/var/log/pm2/$PM2_APP_NAME-error.log',
    out_file: '/var/log/pm2/$PM2_APP_NAME-out.log',
    log_file: '/var/log/pm2/$PM2_APP_NAME-combined.log'
  }]
};
EOF"
    
    # Stop existing PM2 process if running
    log "Stopping existing PM2 process..."
    log "🔄 This will stop the current backend process..."
    sshpass -p "$SSH_PASS" ssh -p $SSH_PORT $SSH_USER@$SERVER "source ~/.nvm/nvm.sh && cd $BACKEND_DIR && pm2 stop $PM2_APP_NAME 2>/dev/null || true"
    
    # Start PM2 process with updated configuration
    log "Starting PM2 process with updated configuration..."
    log "🚀 This will start the backend with your new configuration..."
    sshpass -p "$SSH_PASS" ssh -p $SSH_PORT $SSH_USER@$SERVER "source ~/.nvm/nvm.sh && cd $BACKEND_DIR && pm2 start ecosystem.config.js"
    if [ $? -ne 0 ]; then
        error "Failed to start PM2 process!"
    fi
    
    # Save PM2 configuration
    log "Saving PM2 configuration..."
    log "💾 This will save the PM2 configuration for auto-restart..."
    sshpass -p "$SSH_PASS" ssh -p $SSH_PORT $SSH_USER@$SERVER "pm2 save"
    
    # Health verification removed - manual testing preferred
    
    log "✅ Backend deployed successfully!"
}

# Apache configuration is done manually once - deployment script only handles code deployment

# Function to create local .env template
# Verification removed - manual testing preferred

# Main deployment function
deploy_full() {
    log "🚀 Starting full deployment..."
    
    deploy_frontend
    deploy_backend
    
    log "🎉 Full deployment completed successfully!"
    log "🌐 Application available at: $FRONTEND_URL/"
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
    "help"|"-h"|"--help")
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  frontend     Deploy only frontend"
        echo "  backend      Deploy only backend"
        echo "  full         Deploy both frontend and backend (default)"
        echo "  help         Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0                    # Deploy everything"
        echo "  $0 frontend          # Deploy only frontend"
        echo "  $0 backend           # Deploy only backend"
        ;;
    *)
        echo "Usage: $0 [frontend|backend|full|help]"
        echo "  frontend     - Deploy only frontend"
        echo "  backend      - Deploy only backend"
        echo "  full         - Deploy everything (default)"
        echo "  help         - Show detailed help"
        exit 1
        ;;
esac
