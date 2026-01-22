#!/bin/bash
# Simple VPS Deployment Script from GitHub
# Run this after cloning the repository on VPS

set -e

DEPLOY_PATH="/var/www/license-admin"
DOMAIN="license.zentryasolutions.com"

echo "🚀 Starting Deployment from GitHub..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in project root directory!"
    echo "Please run: cd /var/www/license-admin"
    exit 1
fi

# Update system packages
echo "📦 Updating system packages..."
apt-get update -y

# Install required packages if not installed
echo "📦 Checking/Installing Node.js, PostgreSQL, Nginx, PM2..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

if ! command -v psql &> /dev/null; then
    apt-get install -y postgresql postgresql-contrib
fi

if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
fi

if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

if ! command -v certbot &> /dev/null; then
    apt-get install -y certbot python3-certbot-nginx
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p $DEPLOY_PATH/logs
mkdir -p $DEPLOY_PATH/backups

# Set up PostgreSQL (if not already set up)
echo "🗄️  Setting up PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql

# Create database and user (skip if exists)
sudo -u postgres psql << EOF 2>/dev/null || true
CREATE DATABASE license_admin;
CREATE USER license_admin_user WITH PASSWORD 'Hussn@in0341';
GRANT ALL PRIVILEGES ON DATABASE license_admin TO license_admin_user;
ALTER USER license_admin_user CREATEDB;
\q
EOF

# Run database schema (if not already run)
if [ -f "database/02_COMPLETE_SETUP.sql" ]; then
    echo "📊 Setting up database schema..."
    export PGPASSWORD='Hussn@in0341'
    psql -h localhost -U license_admin_user -d license_admin -f database/02_COMPLETE_SETUP.sql 2>/dev/null || echo "Database schema may already exist"
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
if [ ! -f ".env" ]; then
    echo "⚠️  Creating .env file from example..."
    cp .env.example .env
    echo "⚠️  Please edit backend/.env with your configuration!"
    echo "   Run: nano backend/.env"
fi
npm install --production
cd ..

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm install
npm run build:prod
cd ..

# Configure Nginx (HTTP only first)
echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/$DOMAIN << 'NGINXEOF'
server {
    listen 80;
    listen [::]:80;
    server_name license.zentryasolutions.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXEOF

# Enable Nginx site
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t
systemctl reload nginx

# Get SSL certificate
echo "🔒 Setting up SSL certificate..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@zentryasolutions.com --redirect || echo "⚠️  SSL setup may need manual intervention"

# Start application with PM2
echo "🚀 Starting application..."
if pm2 list | grep -q "license-admin"; then
    pm2 restart license-admin
else
    pm2 start ecosystem.config.js --env production
    pm2 save
    pm2 startup
fi

echo ""
echo "✅ Deployment completed!"
echo ""
echo "📝 Next steps:"
echo "   1. Edit backend/.env with your configuration"
echo "   2. Test: https://$DOMAIN"
echo "   3. Login: admin / admin123"
echo "   4. ⚠️  Change default password immediately!"
echo ""
echo "📖 To update: git pull origin main && pm2 restart license-admin"

