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

# Step 1: Check SSH connection
Write-Host "Step 1: Checking SSH connection..." -ForegroundColor Cyan
Write-Host "⚠️  Please ensure SSH key is set up or you can connect manually" -ForegroundColor Yellow
Write-Host "   Connect via: ssh $VPS_USER@$VPS_HOST" -ForegroundColor Gray

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

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE license_admin;
CREATE USER license_admin_user WITH PASSWORD 'Hussn@in0341';
GRANT ALL PRIVILEGES ON DATABASE license_admin TO license_admin_user;
ALTER USER license_admin_user CREATEDB;
\q
EOF

# Run database schema
echo "📊 Running database schema..."
export PGPASSWORD='Hussn@in0341'
psql -h localhost -U license_admin_user -d license_admin -f `$DEPLOY_PATH/database/02_COMPLETE_SETUP.sql

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd `$DEPLOY_PATH/backend
npm install --production

# Create .env file
echo "⚙️  Creating .env file..."
JWT_SECRET=`$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
cat > `$DEPLOY_PATH/backend/.env << ENVEOF
PORT=3000
NODE_ENV=production
DB_HOST=localhost
DB_PORT=5432
DB_USER=license_admin_user
DB_PASSWORD=Hussn@in0341
DB_NAME=license_admin
JWT_SECRET=`$JWT_SECRET
CORS_ORIGIN=https://`$DOMAIN
ENVEOF

# Configure Nginx
echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/`$DOMAIN << 'NGINXEOF'
server {
    listen 80;
    listen [::]:80;
    server_name `$DOMAIN;

    return 301 https://`$server_name`$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name `$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/`$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/`$DOMAIN/privkey.pem;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

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
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# Set up SSL
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
echo "   1. Test: https://`$DOMAIN"
echo "   2. Check PM2: pm2 status"
echo "   3. View logs: pm2 logs license-admin"
echo "   4. Default admin: username=admin, password=admin123"
echo "   5. ⚠️  Change default password immediately!"
"@

$vpsScript | Out-File -FilePath "$deployDir\deploy-on-vps.sh" -Encoding UTF8

Write-Host "✅ VPS deployment script created" -ForegroundColor Green

# Step 4: Create upload instructions
Write-Host ""
Write-Host "Step 4: Creating upload instructions..." -ForegroundColor Cyan

$uploadInstructions = @'
# 📤 DEPLOYMENT INSTRUCTIONS

## Quick Start

1. Upload the deploy-package folder to your VPS:
   ```bash
   scp -r deploy-package root@147.79.117.39:/var/www/license-admin
   ```

2. SSH into your VPS:
   ```bash
   ssh root@147.79.117.39
   ```

3. Run the deployment script:
   ```bash
   chmod +x /var/www/license-admin/deploy-on-vps.sh
   /var/www/license-admin/deploy-on-vps.sh
   ```

## After Deployment

1. Visit: https://license.zentryasolutions.com
2. Login: admin / admin123
3. ⚠️  Change password immediately!

## Troubleshooting

- PM2 logs: `pm2 logs license-admin`
- Nginx logs: `tail -f /var/log/nginx/error.log`
- Restart: `pm2 restart license-admin`
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
$uploadCommand = "scp -r deploy-package root@" + $VPS_HOST + ":/var/www/license-admin"
Write-Host "Upload command:" -ForegroundColor Cyan
Write-Host $uploadCommand -ForegroundColor Yellow
Write-Host ""


