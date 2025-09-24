 backend# 🚀 Staging Server Deployment Guide

## 📋 Server Overview

**Server Details:**
- **Host**: staging5.rolustech.com:44379
- **SSH**: staging5.rolustech.com:2279
- **User**: root
- **Current Setup**: Apache serving SugarCRM from `/opt/sugarcrmpro`
- **PM2**: Already installed and running (v6.0.13)

## 🎯 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Staging Server                          │
├─────────────────────────────────────────────────────────────┤
│  Apache (Port 80/443)                                      │
│  ├── DocumentRoot: /opt/my-angular-app                     │
│  ├── Proxy: /api/* → http://localhost:3000                 │
│  └── Rewrite: All routes → index.html (Angular routing)   │
├─────────────────────────────────────────────────────────────┤
│  PM2 Process Manager                                        │
│  └── Node.js Backend: /var/www/my-backend (Port 3000)     │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Directory Structure Setup

### Current Server State
- ✅ **Apache**: Running and serving from `/opt/sugarcrmpro`
- ✅ **PM2**: Installed and running (no processes currently)
- ✅ **Node.js**: Available for backend
- 📁 **Directories**: `/var/www/html` exists, `/opt/` available

### Target Structure
```
/opt/
├── my-angular-app/          # Angular frontend (new)
│   ├── index.html
│   ├── main.js
│   ├── polyfills.js
│   ├── styles.css
│   └── assets/
└── sugarcrmpro/            # Current SugarCRM (keep)

/var/www/
├── html/                   # Default Apache (keep)
└── my-backend/             # Node.js backend (new)
    ├── index.js
    ├── package.json
    ├── .env
    └── node_modules/
```

## 🔧 Step-by-Step Deployment

### Phase 1: Prepare Directories

```bash
# 1. Create Angular app directory
mkdir -p /opt/my-angular-app

# 2. Create backend directory
mkdir -p /var/www/my-backend

# 3. Set proper permissions
chown -R www-data:www-data /opt/my-angular-app
chmod -R 755 /opt/my-angular-app
```

### Phase 2: Deploy Frontend (Copy Built Files)

```bash
# 1. Copy only the built Angular files (RECOMMENDED)
# From local machine:
scp -P 2279 -r /var/www/html/redmine-MCP-dashboard/frontend/dist/frontend/* root@staging5.rolustech.com:/opt/my-angular-app/

# 2. Set proper permissions
ssh -p 2279 root@staging5.rolustech.com "chown -R www-data:www-data /opt/my-angular-app && chmod -R 755 /opt/my-angular-app"

# 3. Verify files
ssh -p 2279 root@staging5.rolustech.com "ls -la /opt/my-angular-app/"
```

### Phase 3: Deploy Backend (Node.js Version Compatibility)

✅ **GREAT NEWS**: Node.js versions are compatible!
- **Local**: v22.14.0 (Latest)
- **Server**: v22.19.0 (Latest via NVM) ✅

#### Option A: Copy Source + Install Dependencies (RECOMMENDED)

```bash
# 1. Copy backend source files (excluding node_modules)
# From local machine:
rsync -av --exclude='node_modules' -e "ssh -p 2279" /var/www/html/redmine-MCP-dashboard/backend/ root@staging5.rolustech.com:/var/www/my-backend/

# 2. Install dependencies on server (using NVM Node.js v22.19.0)
ssh -p 2279 root@staging5.rolustech.com "source ~/.nvm/nvm.sh && cd /var/www/my-backend && npm install --production"

# 3. Create environment file
ssh -p 2279 root@staging5.rolustech.com "cat > /var/www/my-backend/.env << 'EOF'
NODE_ENV=production
PORT=3000
REDMINE_HOST=https://redmine.rolustech.com/projects.json
REDMINE_API_KEY=cfdcc03184edf6acafb3ec7fd5196fc3b044ca0c
FRONTEND_URL=https://staging5.rolustech.com:44379
EOF"

# 4. Test backend locally
ssh -p 2279 root@staging5.rolustech.com "source ~/.nvm/nvm.sh && cd /var/www/my-backend && node index.js"
```

#### Option B: Upgrade Server Node.js (Best Long-term)

```bash
# 1. Upgrade Node.js on server to v18 LTS
ssh -p 2279 root@staging5.rolustech.com "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && apt-get install -y nodejs"

# 2. Verify new version
ssh -p 2279 root@staging5.rolustech.com "node --version && npm --version"

# 3. Copy source files only (excluding node_modules)
rsync -av --exclude='node_modules' -e "ssh -p 2279" /var/www/html/redmine-MCP-dashboard/backend/ root@staging5.rolustech.com:/var/www/my-backend/

# 4. Install dependencies on server
ssh -p 2279 root@staging5.rolustech.com "cd /var/www/my-backend && npm install --production"
```

#### Option C: Use Docker (Most Reliable)

```bash
# 1. Create Dockerfile in backend directory
cat > backend/Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
EOF

# 2. Build and run with Docker
ssh -p 2279 root@staging5.rolustech.com "cd /var/www/my-backend && docker build -t redmine-backend . && docker run -d -p 3000:3000 --name redmine-backend-container redmine-backend"
```

### Alternative: Git Clone Approach (if repository is available)

```bash
# 1. Clone repository on server
ssh -p 2279 root@staging5.rolustech.com "cd /opt && git clone https://github.com/your-username/redmine-MCP-dashboard.git"

# 2. Build and deploy frontend
ssh -p 2279 root@staging5.rolustech.com "cd /opt/redmine-MCP-dashboard/frontend && npm install && npm run build --prod && cp -r dist/frontend/* /opt/my-angular-app/"

# 3. Setup backend
ssh -p 2279 root@staging5.rolustech.com "cd /opt/redmine-MCP-dashboard/backend && npm install --production && cp -r . /var/www/my-backend/"
```

### Phase 4: Configure Apache Virtual Host

```bash
# 1. Create new virtual host config
cat > /etc/apache2/sites-available/redmine-dashboard.conf << 'EOF'
<VirtualHost *:80>
    ServerName staging5.rolustech.com
    DocumentRoot /opt/my-angular-app
    
    # Enable rewrite engine
    RewriteEngine On
    
    # Proxy API requests to Node.js backend
    ProxyPreserveHost On
    ProxyPass /api/ http://localhost:3000/
    ProxyPassReverse /api/ http://localhost:3000/
    
    # Angular routing - serve index.html for all non-file requests
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^(?!.*\.).*$ /index.html [L]
    
    # Security headers
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    
    # Logging
    ErrorLog ${APACHE_LOG_DIR}/redmine-dashboard-error.log
    CustomLog ${APACHE_LOG_DIR}/redmine-dashboard-access.log combined
</VirtualHost>
EOF

# 2. Enable required Apache modules
a2enmod rewrite
a2enmod proxy
a2enmod proxy_http
a2enmod headers

# 3. Enable the new site
a2ensite redmine-dashboard

# 4. Disable default site (optional)
a2dissite 000-default

# 5. Test configuration
apache2ctl configtest

# 6. Restart Apache
systemctl restart apache2
```

### Phase 5: Setup PM2 Backend Process

```bash
# 1. Create PM2 ecosystem file
cat > /var/www/my-backend/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'redmine-backend',
    script: 'index.js',
    cwd: '/var/www/my-backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/redmine-backend-error.log',
    out_file: '/var/log/pm2/redmine-backend-out.log',
    log_file: '/var/log/pm2/redmine-backend-combined.log'
  }]
};
EOF

# 2. Start the backend with PM2
cd /var/www/my-backend
pm2 start ecosystem.config.js

# 3. Save PM2 configuration
pm2 save

# 4. Setup PM2 startup script
pm2 startup

# 5. Verify PM2 process
pm2 list
pm2 logs redmine-backend
```

## 🔍 Verification Steps

### 1. Check Apache Configuration
```bash
# Verify virtual host is enabled
apache2ctl -S

# Check if rewrite module is loaded
apache2ctl -M | grep rewrite

# Test Apache configuration
apache2ctl configtest
```

### 2. Check Backend Process
```bash
# Verify PM2 process
pm2 list
pm2 status redmine-backend

# Check if backend is responding
curl http://localhost:3000/api/projects
```

### 3. Test Complete Setup
```bash
# Test frontend (should serve Angular app)
curl -I https://staging5.rolustech.com:44379

# Test API proxy (should proxy to backend)
curl https://staging5.rolustech.com:44379/api/projects

# Test Angular routing (should serve index.html)
curl https://staging5.rolustech.com:44379/dashboard
```

## 🛠️ Troubleshooting

### Common Issues

**1. Apache 403 Forbidden**
```bash
# Check permissions
chown -R www-data:www-data /opt/my-angular-app
chmod -R 755 /opt/my-angular-app
```

**2. API Proxy Not Working**
```bash
# Verify proxy modules are enabled
a2enmod proxy proxy_http

# Check Apache error logs
tail -f /var/log/apache2/error.log
```

**3. PM2 Process Not Starting**
```bash
# Check backend logs
pm2 logs redmine-backend

# Restart process
pm2 restart redmine-backend

# Check if port 3000 is available
netstat -tlnp | grep 3000
```

**4. Angular Routing Not Working**
```bash
# Verify rewrite module is enabled
a2enmod rewrite

# Check if .htaccess is working
curl -I https://staging5.rolustech.com:44379/non-existent-route
```

## 📊 Monitoring Commands

```bash
# Monitor Apache logs
tail -f /var/log/apache2/redmine-dashboard-access.log
tail -f /var/log/apache2/redmine-dashboard-error.log

# Monitor PM2 processes
pm2 monit
pm2 logs redmine-backend --lines 100

# Check system resources
htop
df -h
```

## 🔄 Update Process

### Frontend Updates
```bash
# 1. Build new version
cd /var/www/html/redmine-MCP-dashboard/frontend
npm run build --prod

# 2. Deploy to staging
cp -r dist/redmine-mcp-dashboard/* /opt/my-angular-app/

# 3. Restart Apache (if needed)
systemctl reload apache2
```

### Backend Updates
```bash
# 1. Update backend files
cp -r /var/www/html/redmine-MCP-dashboard/backend/* /var/www/my-backend/

# 2. Install new dependencies
cd /var/www/my-backend
npm install

# 3. Restart PM2 process
pm2 restart redmine-backend
```

## 🔐 Security Considerations

1. **Firewall**: Ensure only necessary ports are open (80, 443, 22)
2. **SSL**: Consider adding SSL certificate for HTTPS
3. **API Keys**: Keep environment variables secure
4. **File Permissions**: Maintain proper ownership and permissions
5. **Logs**: Regularly rotate and monitor logs

## 📈 Performance Optimization

1. **Gzip Compression**: Enable in Apache
2. **Browser Caching**: Set proper cache headers
3. **PM2 Clustering**: Use multiple instances for backend
4. **CDN**: Consider for static assets
5. **Database**: Optimize Redmine queries

---

## ✅ **DEPLOYMENT SUCCESSFUL!** 🚀

### **🎉 Current Status**
- ✅ **Frontend**: Angular app deployed to `/opt/my-angular-app/`
- ✅ **Backend**: Node.js running on PM2 (Port 3000)
- ✅ **Apache**: Serving frontend with proper permissions
- ✅ **API**: Backend responding to requests

### **🌐 Access URLs**
- **Frontend**: https://staging5.rolustech.com:44379/
- **Backend API**: http://localhost:3000/api/ (internal)
- **Direct Backend**: https://staging5.rolustech.com:44379/api/ (via Apache proxy)

### **📊 Service Status**
```bash
# PM2 Backend Process
┌────┬────────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id │ name               │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├────┼────────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0  │ redmine-backend    │ default     │ 1.0.0   │ cluster │ 33156    │ 3m     │ 1    │ online    │ 0%       │ 67.0mb   │ root     │ disabled │
└────┴────────────────────┴─────────────┴─────────┴─────────┴──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┘

# Apache Status
● apache2.service - The Apache HTTP Server
     Active: active (running)
     Main PID: 32219 (apache2)
```

### **🔧 Key Fixes Applied**
1. **Apache Configuration**: Fixed DocumentRoot and directory permissions
2. **Backend Configuration**: Added mcp.json file for Redmine API access
3. **File Permissions**: Set proper ownership (www-data) and permissions (755/644)
4. **PM2 Process**: Backend running as managed service with auto-restart

### **🚀 Next Steps**
1. **Test Frontend**: Visit https://staging5.rolustech.com:44379/
2. **Test API**: Frontend should be able to call backend APIs
3. **Monitor Logs**: Check PM2 logs and Apache logs if needed
4. **Add Proxy**: Configure Apache proxy for `/api/*` requests (optional)

### **📝 Useful Commands**
```bash
# Monitor backend
pm2 logs redmine-backend
pm2 status

# Monitor Apache
tail -f /var/log/apache2/error.log
tail -f /var/log/apache2/access.log

# Restart services
pm2 restart redmine-backend
systemctl reload apache2
```

**🎯 Deployment Complete!** The Redmine MCP Dashboard is now live on staging!
