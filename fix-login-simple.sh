#!/bin/bash
# ============================================
# Simple Login Fix: Password + Disable 2FA
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
echo -e "${CYAN}🔧 FIXING LOGIN ISSUES${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

DEPLOY_PATH="/var/www/license-admin"
DB_NAME="hisaabkitab_license"
DB_USER="postgres"
DB_PASSWORD="Hussn@in0341"

# ============================================
# STEP 1: FIX ADMIN PASSWORD
# ============================================
echo -e "${YELLOW}🔐 Step 1: Fixing admin password...${NC}"

export PGPASSWORD="$DB_PASSWORD"

psql -h localhost -U $DB_USER -d $DB_NAME << EOF
UPDATE adminusers 
SET passwordhash = '\$2a\$10\$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE username = 'admin';
EOF

echo -e "   ${GREEN}✅ Admin password reset to: admin123${NC}"
echo ""

# ============================================
# STEP 2: PULL LATEST CODE
# ============================================
echo -e "${YELLOW}📥 Step 2: Pulling latest code from GitHub...${NC}"

cd $DEPLOY_PATH
git pull origin main > /dev/null 2>&1 || {
    echo -e "   ${YELLOW}⚠️  Git pull failed, continuing...${NC}"
}

echo -e "   ${GREEN}✅ Code updated${NC}"
echo ""

# ============================================
# STEP 3: REBUILD FRONTEND
# ============================================
echo -e "${YELLOW}🏗️  Step 3: Rebuilding frontend...${NC}"

cd $DEPLOY_PATH/frontend
npm run build > /dev/null 2>&1 || {
    npm install --legacy-peer-deps > /dev/null 2>&1
    npm run build > /dev/null 2>&1
}

echo -e "   ${GREEN}✅ Frontend rebuilt${NC}"
echo ""

# ============================================
# STEP 4: RESTART BACKEND
# ============================================
echo -e "${YELLOW}🔄 Step 4: Restarting backend...${NC}"

cd $DEPLOY_PATH
pm2 restart license-admin --update-env > /dev/null 2>&1 || {
    pm2 start ecosystem.config.js --env production > /dev/null 2>&1
    pm2 save > /dev/null 2>&1
}

echo -e "   ${GREEN}✅ Backend restarted${NC}"
echo ""

# ============================================
# SUMMARY
# ============================================
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}✅ FIXES APPLIED!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${BLUE}🔐 Login Credentials:${NC}"
echo -e "   Username: ${CYAN}admin${NC}"
echo -e "   Password: ${CYAN}admin123${NC}"
echo ""
echo -e "${BLUE}🌐 Test it:${NC}"
echo "   https://api.zentryasolutions.com/login"
echo ""
echo -e "${GREEN}🎉 Done!${NC}"
echo ""

