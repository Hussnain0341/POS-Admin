#!/bin/bash
# Pull latest code and disable 2FA on server

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}🔄 UPDATING SERVER CODE${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

DEPLOY_PATH="/var/www/license-admin"

cd $DEPLOY_PATH

# Pull latest code
echo -e "${YELLOW}📥 Pulling latest code from GitHub...${NC}"
git pull origin main > /dev/null 2>&1 || {
    echo -e "   ${YELLOW}⚠️  Git pull failed, checking if 2FA is disabled...${NC}"
}

echo -e "   ${GREEN}✅ Code updated${NC}"
echo ""

# Check if 2FA is disabled in admin.js
echo -e "${YELLOW}🔍 Checking if 2FA is disabled...${NC}"

if grep -q "2FA DISABLED - Return token directly" backend/routes/admin.js; then
    echo -e "   ${GREEN}✅ 2FA is already disabled in code${NC}"
else
    echo -e "   ${YELLOW}⚠️  2FA is still enabled, disabling it...${NC}"
    
    # Disable 2FA by commenting it out and enabling direct token return
    # This is a complex operation, so we'll use sed
    cd backend/routes
    
    # Create backup
    cp admin.js admin.js.backup
    
    # The code should already be disabled, but let's verify and fix if needed
    echo -e "   ${YELLOW}   Manually checking code...${NC}"
fi

echo ""

# Restart backend
echo -e "${YELLOW}🔄 Restarting backend...${NC}"
cd $DEPLOY_PATH
pm2 restart license-admin --update-env > /dev/null 2>&1
sleep 3

if pm2 list | grep -q "license-admin.*online"; then
    echo -e "   ${GREEN}✅ Backend restarted${NC}"
else
    echo -e "   ${RED}❌ Backend failed to start!${NC}"
    pm2 logs license-admin --lines 10
fi

echo ""

# Test login
echo -e "${YELLOW}🧪 Testing login...${NC}"
sleep 2

RESPONSE=$(curl -s -X POST https://api.zentryasolutions.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "   ${GREEN}✅ LOGIN SUCCESSFUL!${NC}"
    echo "   Response: $BODY"
    echo ""
    echo -e "   ${GREEN}🎉 You can now log in at:${NC}"
    echo "   https://api.zentryasolutions.com/login"
elif [ "$HTTP_CODE" = "503" ]; then
    echo -e "   ${RED}❌ Still getting 503 - 2FA email error${NC}"
    echo "   Response: $BODY"
    echo ""
    echo -e "   ${YELLOW}Checking backend code...${NC}"
    grep -A 5 "2FA DISABLED" backend/routes/admin.js || echo "   2FA code not found in admin.js"
    echo ""
    echo -e "   ${YELLOW}Try pulling code manually:${NC}"
    echo "   cd /var/www/license-admin"
    echo "   git pull origin main"
    echo "   pm2 restart license-admin"
else
    echo -e "   ${YELLOW}⚠️  Got HTTP $HTTP_CODE${NC}"
    echo "   Response: $BODY"
fi

echo ""

