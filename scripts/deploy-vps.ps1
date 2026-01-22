# PowerShell Deployment Script for Hostinger VPS
# License Admin System - Production Deployment

param(
    [string]$VPS_HOST = "147.79.117.39",
    [string]$VPS_USER = "root",
    [string]$VPS_PASS = "Hussn@in0341",
    [string]$DEPLOY_PATH = "/var/www/license-admin",
    [string]$DOMAIN = "license.zentryasolutions.com"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 VPS DEPLOYMENT SCRIPT" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Target: ${VPS_USER}@${VPS_HOST}:${DEPLOY_PATH}" -ForegroundColor Yellow
Write-Host "Domain: $DOMAIN" -ForegroundColor Yellow
Write-Host ""

# Check if SSH is available
$sshAvailable = $false
try {
    $null = ssh -V 2>&1
    $sshAvailable = $true
} catch {
    Write-Host "⚠️  SSH not found. Please install OpenSSH or use PuTTY." -ForegroundColor Yellow
    Write-Host "   You can install OpenSSH via: Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0" -ForegroundColor Yellow
}

if (-not $sshAvailable) {
    Write-Host ""
    Write-Host "❌ SSH is required for deployment. Please install OpenSSH first." -ForegroundColor Red
    exit 1
}

# Function to run SSH commands
function Invoke-SSHCommand {
    param([string]$Command)
    
    $sshCommand = "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $VPS_USER@$VPS_HOST `"$Command`""
    
    # Use plink if available, otherwise use ssh with password via sshpass (if installed)
    # For Windows, we'll use ssh with key-based auth or expect script
    # For now, we'll create a script file that user can run manually or use key-based auth
    
    Write-Host "Executing: $Command" -ForegroundColor Gray
    
    # Try to execute via SSH (requires key-based auth or passwordless setup)
    try {
        $result = & ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$VPS_USER@$VPS_HOST" $Command 2>&1
        return $result
    } catch {
        Write-Host "⚠️  SSH command execution may require manual intervention" -ForegroundColor Yellow
        return $null
    }
}

# Step 1: Check SSH connection
Write-Host "Step 1: Checking SSH connection..." -ForegroundColor Cyan
try {
    $testResult = Invoke-SSHCommand "echo 'Connection successful'"
    if ($testResult -match "Connection successful") {
        Write-Host "✅ SSH connection successful" -ForegroundColor Green
    } else {
        Write-Host "⚠️  SSH connection test returned unexpected result" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ SSH connection failed. Please ensure:" -ForegroundColor Red
    Write-Host "   1. SSH key is set up, OR" -ForegroundColor Yellow
    Write-Host "   2. You can manually connect via: ssh $VPS_USER@$VPS_HOST" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Continuing with deployment script generation..." -ForegroundColor Cyan
}

# Step 2: Create deployment package
Write-Host ""
Write-Host "Step 2: Creating deployment package..." -ForegroundColor Cyan

$deployDir = ".\deploy-package"
if (Test-Path $deployDir) {
    Remove-Item -Recurse -Force $deployDir
}
New-Item -ItemType Directory -Path $deployDir | Out-Null
New-Item -ItemType Directory -Path "$deployDir\backend" | Out-Null
New-Item -ItemType Directory -Path "$deployDir\frontend" | Out-Null
New-Item -ItemType Directory -Path "$deployDir\database" | Out-Null
New-Item -ItemType Directory -Path "$deployDir\scripts" | Out-Null

# Copy backend files
Write-Host "  Copying backend files..." -ForegroundColor Gray
Copy-Item -Recurse -Path ".\backend\*" -Destination "$deployDir\backend\" -Exclude "node_modules",".env"
Copy-Item -Path ".\ecosystem.config.js" -Destination "$deployDir\"
Copy-Item -Path ".\package.json" -Destination "$deployDir\"

# Copy frontend build
Write-Host "  Copying frontend build..." -ForegroundColor Gray
if (Test-Path ".\frontend\build") {
    Copy-Item -Recurse -Path ".\frontend\build" -Destination "$deployDir\frontend\"
} else {
    Write-Host "  ⚠️  Frontend build not found. Building now..." -ForegroundColor Yellow
    Set-Location ".\frontend"
    npm run build:prod
    Set-Location ".."
    Copy-Item -Recurse -Path ".\frontend\build" -Destination "$deployDir\frontend\"
}

# Copy database files
Write-Host "  Copying database files..." -ForegroundColor Gray
Copy-Item -Path ".\database\*.sql" -Destination "$deployDir\database\"

# Copy scripts
Write-Host "  Copying scripts..." -ForegroundColor Gray
Copy-Item -Path ".\scripts\*.js" -Destination "$deployDir\scripts\" -Exclude "*.test.js"

Write-Host "✅ Deployment package created" -ForegroundColor Green

# Step 3: Create deployment script for VPS
Write-Host ""
Write-Host "Step 3: Creating VPS deployment script..." -ForegroundColor Cyan

$vpsScript = @"
#!/bin/bash
# Auto-generated VPS Deployment Script
# Run this script on the VPS server

set -e

DEPLOY_PATH="$DEPLOY_PATH"
DOMAIN="$DOMAIN"

echo "🚀 Starting VPS Setup..."

# Update system
echo "📦 Updating system packages..."
apt-get update -y
apt-get upgrade -y

# Install required packages
echo "📦 Installing Node.js, PostgreSQL, Nginx, PM2..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs postgresql postgresql-contrib nginx certbot python3-certbot-nginx

# Install PM2 globally
npm install -g pm2

# Create deployment directory
echo "📁 Creating deployment directory..."
mkdir -p `$DEPLOY_PATH
mkdir -p `$DEPLOY_PATH/logs
mkdir -p `$DEPLOY_PATH/backups

# Set up PostgreSQL
echo "🗄️  Setting up PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql

# Create database and user (you'll need to set password)
sudo -u postgres psql << EOF
CREATE DATABASE license_admin;
CREATE USER license_admin_user WITH PASSWORD 'Hussn@in0341';
GRANT ALL PRIVILEGES ON DATABASE license_admin TO license_admin_user;
\q
EOF

# Run database schema
echo "📊 Running database schema..."
sudo -u postgres psql -d license_admin -f `$DEPLOY_PATH/database/02_COMPLETE_SETUP.sql

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd `$DEPLOY_PATH/backend
npm install --production

# Create .env file
echo "⚙️  Creating .env file..."
cat > `$DEPLOY_PATH/backend/.env << 'ENVEOF'
PORT=3000
NODE_ENV=production
DB_HOST=localhost
DB_PORT=5432
DB_USER=license_admin_user
DB_PASSWORD=Hussn@in0341
DB_NAME=license_admin
JWT_SECRET=`$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
CORS_ORIGIN=https://`$DOMAIN
ENVEOF

# Configure Nginx
echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/`$DOMAIN << 'NGINXEOF'
server {
    listen 80;
    listen [::]:80;
    server_name `$DOMAIN;

    # Redirect HTTP to HTTPS
    return 301 https://`$server_name`$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name `$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/`$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/`$DOMAIN/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
        proxy_cache_bypass `$http_upgrade;
    }
}
NGINXEOF

# Enable Nginx site
ln -sf /etc/nginx/sites-available/`$DOMAIN /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# Set up SSL (will prompt for email)
echo "🔒 Setting up SSL certificate..."
certbot --nginx -d `$DOMAIN --non-interactive --agree-tos --email admin@zentryasolutions.com --redirect || echo "SSL setup may need manual intervention"

# Start application with PM2
echo "🚀 Starting application..."
cd `$DEPLOY_PATH
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

echo "✅ Deployment completed!"
echo ""
echo "📝 Next steps:"
echo "   1. Test the application: https://`$DOMAIN"
echo "   2. Check PM2 status: pm2 status"
echo "   3. View logs: pm2 logs license-admin"
echo "   4. Default admin: username=admin, password=admin123"
echo "   5. ⚠️  Change default admin password immediately!"
"@

$vpsScript | Out-File -FilePath "$deployDir\deploy-on-vps.sh" -Encoding UTF8

Write-Host "✅ VPS deployment script created" -ForegroundColor Green

# Step 4: Create upload instructions
Write-Host ""
Write-Host "Step 4: Creating upload instructions..." -ForegroundColor Cyan

$uploadInstructions = @'
# 📤 DEPLOYMENT INSTRUCTIONS

## Option 1: Manual Upload via SCP/SFTP

1. Upload the entire 'deploy-package' folder to your VPS:
   ```bash
   scp -r deploy-package/* root@147.79.117.39:/var/www/license-admin/
   ```

2. SSH into your VPS:
   ```bash
   ssh root@147.79.117.39
   ```

3. Make the deployment script executable:
   ```bash
   chmod +x /var/www/license-admin/deploy-on-vps.sh
   ```

4. Run the deployment script:
   ```bash
   /var/www/license-admin/deploy-on-vps.sh
   ```

## Option 2: Using WinSCP or FileZilla

1. Connect to your VPS using WinSCP/FileZilla
2. Upload the entire 'deploy-package' folder to /var/www/license-admin
3. SSH into VPS and run the deployment script

## Option 3: Automated (if SSH key is set up)

Run this PowerShell script with SSH key authentication configured.

## After Deployment

1. Visit: https://license.zentryasolutions.com
2. Login with:
   - Username: admin
   - Password: admin123
3. ⚠️  Change the default password immediately!
4. Update database password in backend/.env if needed

## Troubleshooting

- Check PM2 logs: `pm2 logs license-admin`
- Check Nginx logs: `tail -f /var/log/nginx/error.log`
- Check PostgreSQL: `sudo -u postgres psql -d license_admin`
- Restart services: `pm2 restart license-admin`
'@

$uploadInstructions | Out-File -FilePath "$deployDir\DEPLOY_INSTRUCTIONS.md" -Encoding UTF8

Write-Host "✅ Upload instructions created" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ DEPLOYMENT PACKAGE READY!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📦 Package location: $deployDir" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Review: $deployDir\DEPLOY_INSTRUCTIONS.md" -ForegroundColor White
Write-Host "  2. Upload deploy-package folder to VPS" -ForegroundColor White
Write-Host "  3. SSH into VPS and run deploy-on-vps.sh" -ForegroundColor White
Write-Host ""
$uploadCmd = "scp -r deploy-package root@" + $VPS_HOST + ":" + $DEPLOY_PATH
Write-Host "Upload command: $uploadCmd" -ForegroundColor Yellow
Write-Host ""

