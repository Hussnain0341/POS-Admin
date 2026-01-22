#!/bin/bash
# ============================================
# Change Admin Password Script
# Generates strong password and updates database
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}🔐 CHANGE ADMIN PASSWORD${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Configuration
DB_NAME="hisaabkitab_license"
DB_USER="postgres"
DB_PASSWORD="Hussn@in0341"
ADMIN_USERNAME="admin"
DEPLOY_PATH="/var/www/license-admin"

export PGPASSWORD="$DB_PASSWORD"

# ============================================
# STEP 1: GET NEW PASSWORD
# ============================================
echo -e "${YELLOW}🔐 Step 1: Enter new password${NC}"
echo ""
echo "Password requirements:"
echo "  - At least 8 characters"
echo "  - Mix of uppercase, lowercase, numbers, and special characters"
echo ""

# Check if password provided as argument
if [ -n "$1" ]; then
    NEW_PASSWORD="$1"
    echo "Using provided password..."
else
    # Generate strong password
    echo -e "${YELLOW}Generating strong password...${NC}"
    NEW_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
    NEW_PASSWORD="${NEW_PASSWORD}$(openssl rand -base64 4 | tr -d "=+/" | cut -c1-4 | tr '[:lower:]' '[:upper:]')"
    NEW_PASSWORD="${NEW_PASSWORD}$(openssl rand -base64 4 | tr -d "=+/" | cut -c1-4 | tr '[:upper:]' '[:lower:]')"
    NEW_PASSWORD="${NEW_PASSWORD}$(openssl rand -base64 4 | tr -d "=+/" | cut -c1-2)"
    NEW_PASSWORD="${NEW_PASSWORD}@"
    
    echo -e "   ${GREEN}✅ Generated strong password${NC}"
    echo ""
    echo -e "   ${CYAN}Generated Password: ${NEW_PASSWORD}${NC}"
    echo ""
    echo -e "   ${YELLOW}⚠️  IMPORTANT: Save this password securely!${NC}"
    echo ""
    
    read -p "Use this password? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        read -sp "Enter your own password: " NEW_PASSWORD
        echo ""
        read -sp "Confirm password: " CONFIRM_PASSWORD
        echo ""
        
        if [ "$NEW_PASSWORD" != "$CONFIRM_PASSWORD" ]; then
            echo -e "   ${RED}❌ Passwords don't match!${NC}"
            exit 1
        fi
        
        if [ ${#NEW_PASSWORD} -lt 8 ]; then
            echo -e "   ${RED}❌ Password must be at least 8 characters!${NC}"
            exit 1
        fi
    fi
fi

echo ""

# ============================================
# STEP 2: GENERATE PASSWORD HASH
# ============================================
echo -e "${YELLOW}🔐 Step 2: Generating password hash...${NC}"

cd $DEPLOY_PATH/backend

# Check if bcryptjs is installed
if [ ! -d "node_modules/bcryptjs" ]; then
    echo "   Installing bcryptjs..."
    npm install bcryptjs > /dev/null 2>&1
fi

# Generate hash
cat > /tmp/generate-password-hash.js << 'GENEOF'
const bcrypt = require('bcryptjs');
const password = process.argv[2];

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
  console.log(hash);
  process.exit(0);
});
GENEOF

PASSWORD_HASH=$(node /tmp/generate-password-hash.js "$NEW_PASSWORD")

if [ -z "$PASSWORD_HASH" ] || [ ${#PASSWORD_HASH} -lt 50 ]; then
    echo -e "   ${RED}❌ Failed to generate hash!${NC}"
    exit 1
fi

rm -f /tmp/generate-password-hash.js

echo -e "   ${GREEN}✅ Password hash generated${NC}"
echo ""

# ============================================
# STEP 3: UPDATE DATABASE
# ============================================
echo -e "${YELLOW}💾 Step 3: Updating password in database...${NC}"

psql -h localhost -U $DB_USER -d $DB_NAME << EOF
UPDATE adminusers 
SET passwordhash = '$PASSWORD_HASH'
WHERE username = '$ADMIN_USERNAME';

-- Verify update
SELECT 
    username,
    CASE 
        WHEN passwordhash IS NOT NULL AND LENGTH(passwordhash) = 60 THEN 'Password updated'
        ELSE 'Password hash issue'
    END as status,
    LENGTH(passwordhash) as hash_length
FROM adminusers 
WHERE username = '$ADMIN_USERNAME';
EOF

echo -e "   ${GREEN}✅ Password updated in database${NC}"
echo ""

# ============================================
# STEP 4: RESTART BACKEND
# ============================================
echo -e "${YELLOW}🔄 Step 4: Restarting backend...${NC}"

cd $DEPLOY_PATH
pm2 restart license-admin --update-env > /dev/null 2>&1
sleep 2

if pm2 list | grep -q "license-admin.*online"; then
    echo -e "   ${GREEN}✅ Backend restarted${NC}"
else
    echo -e "   ${RED}❌ Backend failed to start!${NC}"
    pm2 logs license-admin --lines 10
fi

echo ""

# ============================================
# STEP 5: TEST LOGIN
# ============================================
echo -e "${YELLOW}🧪 Step 5: Testing login with new password...${NC}"

sleep 2

RESPONSE=$(curl -s -X POST https://api.zentryasolutions.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$NEW_PASSWORD\"}" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ] || echo "$BODY" | grep -q "require2FA\|token"; then
    echo -e "   ${GREEN}✅ Login test successful!${NC}"
else
    echo -e "   ${YELLOW}⚠️  Login test returned HTTP $HTTP_CODE${NC}"
    echo "   Response: $BODY"
fi

echo ""

# ============================================
# SUMMARY
# ============================================
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}✅ PASSWORD CHANGED SUCCESSFULLY!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${BLUE}🔐 New Login Credentials:${NC}"
echo -e "   Username: ${CYAN}$ADMIN_USERNAME${NC}"
echo -e "   Password: ${CYAN}$NEW_PASSWORD${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT:${NC}"
echo "   • Save this password securely"
echo "   • Don't share it with anyone"
echo "   • Use a password manager"
echo ""
echo -e "${BLUE}🌐 Login URL:${NC}"
echo "   https://api.zentryasolutions.com/login"
echo ""
echo -e "${GREEN}🎉 Done!${NC}"
echo ""

