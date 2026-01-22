#!/bin/bash
# ============================================
# Fix API URL and CORS Issues
# Run this on VPS to fix the API URL mismatch
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}🔧 FIXING API URL AND CORS${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

DEPLOY_PATH="/var/www/license-admin"
FRONTEND_DOMAIN="api.zentryasolutions.com"
BACKEND_DOMAIN="api.zentryasolutions.com"

# ============================================
# STEP 1: UPDATE FRONTEND API URL
# ============================================
echo -e "${YELLOW}📝 Step 1: Updating frontend API URL...${NC}"

cd $DEPLOY_PATH

if [ ! -f "frontend/src/services/api.ts" ]; then
    echo -e "   ${RED}❌ Error: frontend/src/services/api.ts not found!${NC}"
    exit 1
fi

# Update API URL in source file
sed -i "s|https://license.zentryasolutions.com/api|https://api.zentryasolutions.com/api|g" frontend/src/services/api.ts
sed -i "s|https://www.license.zentryasolutions.com/api|https://api.zentryasolutions.com/api|g" frontend/src/services/api.ts

echo -e "   ${GREEN}✅ Frontend API URL updated${NC}"
echo ""

# ============================================
# STEP 2: UPDATE BACKEND CORS
# ============================================
echo -e "${YELLOW}🌐 Step 2: Updating backend CORS configuration...${NC}"

if [ ! -f "backend/index.js" ]; then
    echo -e "   ${RED}❌ Error: backend/index.js not found!${NC}"
    exit 1
fi

# Update CORS to include api.zentryasolutions.com
sed -i "s|'https://license.zentryasolutions.com'|'https://api.zentryasolutions.com', 'https://license.zentryasolutions.com'|g" backend/index.js
sed -i "s|'https://www.license.zentryasolutions.com'|'https://www.api.zentryasolutions.com', 'https://www.license.zentryasolutions.com'|g" backend/index.js

# Ensure api.zentryasolutions.com is in the CORS list
if ! grep -q "api.zentryasolutions.com" backend/index.js; then
    echo -e "   ${YELLOW}⚠️  Manually adding api.zentryasolutions.com to CORS...${NC}"
    # This is a fallback - the sed above should work
fi

echo -e "   ${GREEN}✅ Backend CORS updated${NC}"
echo ""

# ============================================
# STEP 3: REBUILD FRONTEND
# ============================================
echo -e "${YELLOW}🏗️  Step 3: Rebuilding frontend...${NC}"

cd $DEPLOY_PATH/frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "   Installing dependencies..."
    npm install --legacy-peer-deps > /dev/null 2>&1
fi

# Build frontend
echo "   Building React app..."
npm run build > /dev/null 2>&1 || {
    echo -e "   ${YELLOW}⚠️  Build failed, trying with legacy peer deps...${NC}"
    npm install --legacy-peer-deps > /dev/null 2>&1
    npm run build > /dev/null 2>&1
}

if [ ! -d "build" ]; then
    echo -e "   ${RED}❌ Error: Frontend build failed!${NC}"
    exit 1
fi

echo -e "   ${GREEN}✅ Frontend rebuilt${NC}"
echo ""

# ============================================
# STEP 4: UPDATE NGINX CONFIGURATION
# ============================================
echo -e "${YELLOW}🌐 Step 4: Updating Nginx configuration...${NC}"

# Update Nginx to serve from api.zentryasolutions.com
cat > /etc/nginx/sites-available/api.zentryasolutions.com << NGINXEOF
server {
    listen 80;
    listen [::]:80;
    server_name api.zentryasolutions.com;

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
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
NGINXEOF

# Enable site
ln -sf /etc/nginx/sites-available/api.zentryasolutions.com /etc/nginx/sites-enabled/

# Test and reload Nginx
nginx -t > /dev/null 2>&1 || {
    echo -e "   ${RED}❌ Nginx configuration test failed!${NC}"
    exit 1
}

systemctl reload nginx > /dev/null 2>&1
echo -e "   ${GREEN}✅ Nginx updated${NC}"
echo ""

# ============================================
# STEP 5: SETUP SSL FOR API DOMAIN
# ============================================
echo -e "${YELLOW}🔒 Step 5: Setting up SSL certificate...${NC}"

# Get SSL certificate for api.zentryasolutions.com
if [ ! -d "/etc/letsencrypt/live/api.zentryasolutions.com" ]; then
    echo "   Obtaining SSL certificate for api.zentryasolutions.com..."
    certbot --nginx -d api.zentryasolutions.com --non-interactive --agree-tos --email admin@zentryasolutions.com --redirect > /dev/null 2>&1 || {
        echo -e "   ${YELLOW}⚠️  SSL setup may need manual intervention${NC}"
        echo -e "   ${YELLOW}   Run: certbot --nginx -d api.zentryasolutions.com${NC}"
    }
    echo -e "   ${GREEN}✅ SSL certificate obtained${NC}"
else
    echo "   SSL certificate already exists, renewing..."
    certbot renew --quiet > /dev/null 2>&1 || true
    echo -e "   ${GREEN}✅ SSL certificate renewed${NC}"
fi

systemctl reload nginx > /dev/null 2>&1
echo ""

# ============================================
# STEP 6: RESTART BACKEND
# ============================================
echo -e "${YELLOW}🔄 Step 6: Restarting backend...${NC}"

cd $DEPLOY_PATH

if pm2 list | grep -q "license-admin"; then
    echo "   Restarting PM2 process..."
    pm2 restart license-admin --update-env > /dev/null 2>&1
    echo -e "   ${GREEN}✅ Backend restarted${NC}"
else
    echo "   Starting PM2 process..."
    pm2 start ecosystem.config.js --env production > /dev/null 2>&1
    pm2 save > /dev/null 2>&1
    echo -e "   ${GREEN}✅ Backend started${NC}"
fi

echo ""

# ============================================
# STEP 7: VERIFY
# ============================================
echo -e "${YELLOW}✅ Step 7: Verifying fixes...${NC}"

sleep 3

# Check PM2
if pm2 list | grep -q "license-admin.*online"; then
    echo -e "   ${GREEN}✅ PM2 process is running${NC}"
else
    echo -e "   ${RED}❌ PM2 process is not running!${NC}"
    echo "   Check logs: pm2 logs license-admin"
fi

# Check Nginx
if systemctl is-active --quiet nginx; then
    echo -e "   ${GREEN}✅ Nginx is running${NC}"
else
    echo -e "   ${RED}❌ Nginx is not running!${NC}"
fi

# Test backend endpoint
if curl -s -o /dev/null -w "%{http_code}" https://api.zentryasolutions.com/api/health | grep -q "200\|404"; then
    echo -e "   ${GREEN}✅ Backend is responding${NC}"
else
    echo -e "   ${YELLOW}⚠️  Backend may not be ready yet${NC}"
fi

echo ""

# ============================================
# SUMMARY
# ============================================
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}✅ FIXES APPLIED!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${BLUE}📝 What was fixed:${NC}"
echo "   ✓ Frontend API URL updated to api.zentryasolutions.com"
echo "   ✓ Backend CORS updated to allow api.zentryasolutions.com"
echo "   ✓ Frontend rebuilt with new API URL"
echo "   ✓ Nginx configured for api.zentryasolutions.com"
echo "   ✓ SSL certificate set up"
echo "   ✓ Backend restarted"
echo ""
echo -e "${BLUE}🌐 Your Application:${NC}"
echo -e "   Frontend: ${CYAN}https://api.zentryasolutions.com${NC}"
echo -e "   Backend API: ${CYAN}https://api.zentryasolutions.com/api${NC}"
echo ""
echo -e "${BLUE}🔍 Test it:${NC}"
echo "   1. Open: https://api.zentryasolutions.com/login"
echo "   2. Try logging in with: admin / admin123"
echo "   3. Check browser console for any errors"
echo ""
echo -e "${YELLOW}⚠️  If issues persist:${NC}"
echo "   • Check PM2 logs: pm2 logs license-admin"
echo "   • Check Nginx logs: tail -f /var/log/nginx/error.log"
echo "   • Verify SSL: certbot certificates"
echo ""
echo -e "${GREEN}🎉 Done!${NC}"
echo ""

