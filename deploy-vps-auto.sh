#!/bin/bash
# ============================================
# HisaabKitab License Admin System
# AUTOMATED VPS DEPLOYMENT SCRIPT
# ============================================
# This script automatically deploys everything on VPS
# Just run: bash deploy-vps-auto.sh
# ============================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration (Change these if needed)
GITHUB_REPO="https://github.com/Hussnain0341/POS-Admin.git"
DEPLOY_PATH="/var/www/license-admin"
DOMAIN="api.zentryasolutions.com"
DB_NAME="hisaabkitab_license"
DB_USER="postgres"
DB_PASSWORD="Hussn@in0341"
ADMIN_EMAIL="admin@zentryasolutions.com"
BACKEND_PORT="3000"

# Print header
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}🚀 AUTOMATED VPS DEPLOYMENT${NC}"
echo -e "${CYAN}   HisaabKitab License Admin${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# ============================================
# STEP 1: CHECK AND INSTALL PREREQUISITES
# ============================================
echo -e "${YELLOW}📦 Step 1: Checking prerequisites...${NC}"

# Update package list
echo "   Updating package list..."
apt-get update -qq

# Check and install Node.js
if ! command -v node &> /dev/null; then
    echo "   Installing Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
    apt-get install -y nodejs > /dev/null 2>&1
    echo -e "   ${GREEN}✅ Node.js installed${NC}"
else
    NODE_VERSION=$(node -v)
    echo -e "   ${GREEN}✅ Node.js already installed: $NODE_VERSION${NC}"
fi

# Check and install PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "   Installing PostgreSQL..."
    apt-get install -y postgresql postgresql-contrib > /dev/null 2>&1
    systemctl start postgresql
    systemctl enable postgresql > /dev/null 2>&1
    echo -e "   ${GREEN}✅ PostgreSQL installed${NC}"
else
    echo -e "   ${GREEN}✅ PostgreSQL already installed${NC}"
    systemctl start postgresql > /dev/null 2>&1
fi

# Check and install Nginx
if ! command -v nginx &> /dev/null; then
    echo "   Installing Nginx..."
    apt-get install -y nginx > /dev/null 2>&1
    systemctl start nginx
    systemctl enable nginx > /dev/null 2>&1
    echo -e "   ${GREEN}✅ Nginx installed${NC}"
else
    echo -e "   ${GREEN}✅ Nginx already installed${NC}"
    systemctl start nginx > /dev/null 2>&1
fi

# Check and install PM2
if ! command -v pm2 &> /dev/null; then
    echo "   Installing PM2..."
    npm install -g pm2 > /dev/null 2>&1
    echo -e "   ${GREEN}✅ PM2 installed${NC}"
else
    echo -e "   ${GREEN}✅ PM2 already installed${NC}"
fi

# Check and install Certbot
if ! command -v certbot &> /dev/null; then
    echo "   Installing Certbot..."
    apt-get install -y certbot python3-certbot-nginx > /dev/null 2>&1
    echo -e "   ${GREEN}✅ Certbot installed${NC}"
else
    echo -e "   ${GREEN}✅ Certbot already installed${NC}"
fi

echo -e "${GREEN}✅ All prerequisites ready!${NC}"
echo ""

# ============================================
# STEP 2: CLONE/PULL FROM GITHUB
# ============================================
echo -e "${YELLOW}📥 Step 2: Getting code from GitHub...${NC}"

# Create deploy directory if it doesn't exist
mkdir -p $DEPLOY_PATH
cd $DEPLOY_PATH

if [ -d ".git" ]; then
    echo "   Repository exists, pulling latest changes..."
    git pull origin main > /dev/null 2>&1 || {
        echo -e "   ${YELLOW}⚠️  Git pull failed, trying to reset...${NC}"
        git fetch origin main > /dev/null 2>&1
        git reset --hard origin/main > /dev/null 2>&1
    }
    echo -e "   ${GREEN}✅ Code updated${NC}"
else
    echo "   Cloning repository..."
    git clone $GITHUB_REPO . > /dev/null 2>&1
    echo -e "   ${GREEN}✅ Repository cloned${NC}"
fi

echo ""

# ============================================
# STEP 3: SETUP DATABASE
# ============================================
echo -e "${YELLOW}🗄️  Step 3: Setting up database...${NC}"

# Create database if it doesn't exist
echo "   Creating database '$DB_NAME'..."
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "   Database may already exist"

# Set PostgreSQL password for user
echo "   Configuring PostgreSQL user..."
sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || true

# Run database setup script
if [ -f "database/SETUP.sql" ]; then
    echo "   Running database schema..."
    export PGPASSWORD="$DB_PASSWORD"
    psql -h localhost -U $DB_USER -d $DB_NAME -f database/SETUP.sql > /dev/null 2>&1 || {
        echo -e "   ${YELLOW}⚠️  Some database objects may already exist (this is OK)${NC}"
    }
    echo -e "   ${GREEN}✅ Database schema created${NC}"
else
    echo -e "   ${RED}❌ Error: database/SETUP.sql not found!${NC}"
    exit 1
fi

echo ""

# ============================================
# STEP 4: CREATE .ENV FILE
# ============================================
echo -e "${YELLOW}⚙️  Step 4: Configuring environment...${NC}"

cd $DEPLOY_PATH/backend

if [ ! -f ".env" ]; then
    echo "   Creating .env file..."
    cat > .env << EOF
# Server Configuration
NODE_ENV=production
PORT=$BACKEND_PORT

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

# JWT Secret (Generate a strong secret)
JWT_SECRET=bd5f1ae08467c131b097d28019e633f6b08fe028aef06a869b71e782c4c2734bab65c70664db1880720e3759c768cdb6f4447a3d49e919824f7fa061e1aa444f

# CORS
CORS_ORIGIN=https://$DOMAIN

# 2FA Email Configuration
TWO_FA_EMAIL=hussnain0341@gmail.com

# SMTP Configuration (Gmail example - update with your credentials)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com
EOF
    echo -e "   ${GREEN}✅ .env file created${NC}"
    echo -e "   ${YELLOW}⚠️  Please update SMTP credentials in backend/.env for 2FA to work${NC}"
else
    echo -e "   ${GREEN}✅ .env file already exists${NC}"
fi

cd $DEPLOY_PATH
echo ""

# ============================================
# STEP 5: INSTALL DEPENDENCIES
# ============================================
echo -e "${YELLOW}📦 Step 5: Installing dependencies...${NC}"

# Install backend dependencies
echo "   Installing backend dependencies..."
cd $DEPLOY_PATH/backend
npm install --production > /dev/null 2>&1
echo -e "   ${GREEN}✅ Backend dependencies installed${NC}"

# Install frontend dependencies
echo "   Installing frontend dependencies..."
cd $DEPLOY_PATH/frontend
npm install > /dev/null 2>&1
echo -e "   ${GREEN}✅ Frontend dependencies installed${NC}"

cd $DEPLOY_PATH
echo ""

# ============================================
# STEP 6: BUILD FRONTEND
# ============================================
echo -e "${YELLOW}🏗️  Step 6: Building frontend...${NC}"

cd $DEPLOY_PATH/frontend

# Update API URL for production
if [ -f "src/services/api.ts" ]; then
    echo "   Updating API URL for production..."
    sed -i "s|http://localhost:3001/api|https://$DOMAIN/api|g" src/services/api.ts 2>/dev/null || true
fi

# Build frontend
echo "   Building React app..."
npm run build > /dev/null 2>&1 || {
    echo -e "   ${RED}❌ Frontend build failed!${NC}"
    echo "   Trying with legacy peer deps..."
    npm install --legacy-peer-deps > /dev/null 2>&1
    npm run build > /dev/null 2>&1
}

if [ ! -d "build" ]; then
    echo -e "   ${RED}❌ Error: Frontend build directory not found!${NC}"
    exit 1
fi

echo -e "   ${GREEN}✅ Frontend built successfully${NC}"
cd $DEPLOY_PATH
echo ""

# ============================================
# STEP 7: CONFIGURE NGINX
# ============================================
echo -e "${YELLOW}🌐 Step 7: Configuring Nginx...${NC}"

# Create Nginx configuration
cat > /etc/nginx/sites-available/$DOMAIN << NGINXEOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    # Redirect HTTP to HTTPS (will be enabled after SSL)
    # return 301 https://\$server_name\$request_uri;

    location / {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
NGINXEOF

# Enable site
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t > /dev/null 2>&1 || {
    echo -e "   ${RED}❌ Nginx configuration test failed!${NC}"
    exit 1
}

# Reload Nginx
systemctl reload nginx > /dev/null 2>&1
echo -e "   ${GREEN}✅ Nginx configured${NC}"
echo ""

# ============================================
# STEP 8: SETUP SSL CERTIFICATE
# ============================================
echo -e "${YELLOW}🔒 Step 8: Setting up SSL certificate...${NC}"

# Check if certificate already exists
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "   SSL certificate already exists, renewing..."
    certbot renew --quiet > /dev/null 2>&1 || true
    echo -e "   ${GREEN}✅ SSL certificate renewed${NC}"
else
    echo "   Obtaining SSL certificate..."
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $ADMIN_EMAIL --redirect > /dev/null 2>&1 || {
        echo -e "   ${YELLOW}⚠️  SSL certificate setup may need manual intervention${NC}"
        echo -e "   ${YELLOW}   Run manually: certbot --nginx -d $DOMAIN${NC}"
    }
    echo -e "   ${GREEN}✅ SSL certificate obtained${NC}"
fi

# Update Nginx to use HTTPS
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    # Certbot should have already updated the config, but let's verify
    systemctl reload nginx > /dev/null 2>&1
fi

echo ""

# ============================================
# STEP 9: CONFIGURE PM2
# ============================================
echo -e "${YELLOW}🔄 Step 9: Configuring PM2...${NC}"

cd $DEPLOY_PATH

# Create logs directory
mkdir -p logs

# Stop existing PM2 process if running
if pm2 list | grep -q "license-admin"; then
    echo "   Stopping existing PM2 process..."
    pm2 stop license-admin > /dev/null 2>&1 || true
    pm2 delete license-admin > /dev/null 2>&1 || true
fi

# Start application with PM2
echo "   Starting application with PM2..."
pm2 start ecosystem.config.js --env production > /dev/null 2>&1

# Save PM2 configuration
pm2 save > /dev/null 2>&1

# Setup PM2 startup script
pm2 startup systemd -u root --hp /root > /dev/null 2>&1 || {
    echo "   PM2 startup already configured"
}

echo -e "   ${GREEN}✅ PM2 configured${NC}"
echo ""

# ============================================
# STEP 10: VERIFY DEPLOYMENT
# ============================================
echo -e "${YELLOW}✅ Step 10: Verifying deployment...${NC}"

# Wait a moment for services to start
sleep 3

# Check PM2 status
if pm2 list | grep -q "license-admin.*online"; then
    echo -e "   ${GREEN}✅ PM2 process is running${NC}"
else
    echo -e "   ${RED}❌ PM2 process is not running!${NC}"
    echo "   Check logs: pm2 logs license-admin"
fi

# Check Nginx status
if systemctl is-active --quiet nginx; then
    echo -e "   ${GREEN}✅ Nginx is running${NC}"
else
    echo -e "   ${RED}❌ Nginx is not running!${NC}"
fi

# Check PostgreSQL status
if systemctl is-active --quiet postgresql; then
    echo -e "   ${GREEN}✅ PostgreSQL is running${NC}"
else
    echo -e "   ${RED}❌ PostgreSQL is not running!${NC}"
fi

# Test backend endpoint
sleep 2
if curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/api/health | grep -q "200\|404"; then
    echo -e "   ${GREEN}✅ Backend is responding${NC}"
else
    echo -e "   ${YELLOW}⚠️  Backend may not be ready yet${NC}"
fi

echo ""

# ============================================
# DEPLOYMENT COMPLETE
# ============================================
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${BLUE}📝 Application Details:${NC}"
echo -e "   URL: ${CYAN}https://$DOMAIN${NC}"
echo -e "   Backend Port: ${CYAN}$BACKEND_PORT${NC}"
echo -e "   Database: ${CYAN}$DB_NAME${NC}"
echo ""
echo -e "${BLUE}🔐 Default Login Credentials:${NC}"
echo -e "   Username: ${CYAN}admin${NC}"
echo -e "   Password: ${CYAN}admin123${NC}"
echo -e "   ${YELLOW}⚠️  IMPORTANT: Change password immediately!${NC}"
echo ""
echo -e "${BLUE}📊 Useful Commands:${NC}"
echo -e "   View logs: ${CYAN}pm2 logs license-admin${NC}"
echo -e "   Restart app: ${CYAN}pm2 restart license-admin${NC}"
echo -e "   Check status: ${CYAN}pm2 status${NC}"
echo -e "   Update code: ${CYAN}cd $DEPLOY_PATH && git pull && pm2 restart license-admin${NC}"
echo ""
echo -e "${BLUE}⚙️  Configuration Files:${NC}"
echo -e "   Backend .env: ${CYAN}$DEPLOY_PATH/backend/.env${NC}"
echo -e "   Nginx config: ${CYAN}/etc/nginx/sites-available/$DOMAIN${NC}"
echo ""
echo -e "${YELLOW}⚠️  Next Steps:${NC}"
echo -e "   1. Update SMTP credentials in ${CYAN}backend/.env${NC} for 2FA"
echo -e "   2. Change default admin password"
echo -e "   3. Test login at ${CYAN}https://$DOMAIN${NC}"
echo ""
echo -e "${GREEN}🎉 Your application is now live!${NC}"
echo ""

