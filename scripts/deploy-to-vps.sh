#!/bin/bash
# Automated VPS Deployment Script for Hostinger
# This script will deploy the License Admin System to the VPS

set -e

VPS_HOST="147.79.117.39"
VPS_USER="root"
VPS_PASS="Hussn@in0341"
DEPLOY_PATH="/var/www/license-admin"
DOMAIN="license.zentryasolutions.com"

echo "🚀 Starting VPS Deployment..."
echo "Target: $VPS_USER@$VPS_HOST:$DEPLOY_PATH"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Function to run SSH commands
ssh_cmd() {
    sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" "$1"
}

# Function to copy files
scp_cmd() {
    sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no -r "$1" "$VPS_USER@$VPS_HOST:$2"
}

echo -e "${YELLOW}Step 1: Checking SSH connection...${NC}"
if ssh_cmd "echo 'Connection successful'"; then
    echo -e "${GREEN}✅ SSH connection successful${NC}"
else
    echo -e "${RED}❌ SSH connection failed${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 2: Installing required packages on VPS...${NC}"
ssh_cmd "apt-get update && apt-get install -y nodejs npm postgresql-client nginx certbot python3-certbot-nginx pm2 git"

echo -e "${YELLOW}Step 3: Creating deployment directory...${NC}"
ssh_cmd "mkdir -p $DEPLOY_PATH && mkdir -p $DEPLOY_PATH/backups && mkdir -p $DEPLOY_PATH/logs"

echo -e "${YELLOW}Step 4: Building frontend locally...${NC}"
cd frontend
npm install
REACT_APP_API_URL=https://license.zentryasolutions.com/api npm run build
cd ..

echo -e "${YELLOW}Step 5: Uploading files to VPS...${NC}"
# Upload backend
scp_cmd "backend" "$DEPLOY_PATH/"
# Upload frontend build
scp_cmd "frontend/build" "$DEPLOY_PATH/frontend/"
# Upload scripts
scp_cmd "scripts" "$DEPLOY_PATH/"
# Upload config files
scp_cmd "ecosystem.config.js" "$DEPLOY_PATH/"
scp_cmd "package.json" "$DEPLOY_PATH/"

echo -e "${YELLOW}Step 6: Installing backend dependencies on VPS...${NC}"
ssh_cmd "cd $DEPLOY_PATH/backend && npm install --production"

echo -e "${YELLOW}Step 7: Creating .env file on VPS...${NC}"
# Note: User will need to update this with actual database credentials
ssh_cmd "cat > $DEPLOY_PATH/backend/.env << 'EOF'
PORT=3000
NODE_ENV=production
DB_HOST=localhost
DB_PORT=5432
DB_USER=license_admin
DB_PASSWORD=ChangeMe123!
DB_NAME=license_admin
JWT_SECRET=\$(node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\")
CORS_ORIGIN=https://license.zentryasolutions.com
ADMIN_USERNAME=superadmin
ADMIN_PASSWORD=ChangeMe123!
EOF"

echo -e "${YELLOW}Step 8: Setting up Nginx configuration...${NC}"
ssh_cmd "cat > /etc/nginx/sites-available/$DOMAIN << 'NGINX_EOF'
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # Security headers
    add_header X-Frame-Options \"SAMEORIGIN\" always;
    add_header X-Content-Type-Options \"nosniff\" always;
    add_header X-XSS-Protection \"1; mode=block\" always;

    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX_EOF"

echo -e "${YELLOW}Step 9: Enabling Nginx site...${NC}"
ssh_cmd "ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx"

echo -e "${YELLOW}Step 10: Setting up SSL certificate...${NC}"
ssh_cmd "certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@zentryasolutions.com --redirect || echo 'SSL setup may need manual intervention'"

echo -e "${YELLOW}Step 11: Starting application with PM2...${NC}"
ssh_cmd "cd $DEPLOY_PATH && pm2 start ecosystem.config.js --env production && pm2 save && pm2 startup"

echo -e "${GREEN}✅ Deployment completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Update database credentials in $DEPLOY_PATH/backend/.env"
echo "2. Run database setup: ssh $VPS_USER@$VPS_HOST 'cd $DEPLOY_PATH && node scripts/production-setup.js'"
echo "3. Test the application: https://$DOMAIN"
echo ""
echo "Default admin credentials:"
echo "  Username: superadmin"
echo "  Password: ChangeMe123!"
echo "  ⚠️  Change this immediately after first login!"




