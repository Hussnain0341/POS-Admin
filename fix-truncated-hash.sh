#!/bin/bash
# Fix truncated password hash - the $ characters were interpreted by shell

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}🔐 FIXING TRUNCATED PASSWORD HASH${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

DB_NAME="hisaabkitab_license"
DB_USER="postgres"
DB_PASSWORD="Hussn@in0341"

export PGPASSWORD="$DB_PASSWORD"

# Generate new hash
cd /var/www/license-admin/backend
NEW_HASH=$(node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('admin123', 10, (e, h) => { console.log(h); });")

echo -e "${YELLOW}Generated hash: ${NEW_HASH}${NC}"
echo -e "${YELLOW}Hash length: ${#NEW_HASH}${NC}"
echo ""

# Update database using psql with proper escaping
echo -e "${YELLOW}Updating database...${NC}"

psql -h localhost -U $DB_USER -d $DB_NAME << EOF
UPDATE adminusers 
SET passwordhash = '$NEW_HASH'
WHERE username = 'admin';

-- Verify
SELECT 
    username,
    LENGTH(passwordhash) as hash_length,
    LEFT(passwordhash, 30) as hash_start
FROM adminusers 
WHERE username = 'admin';
EOF

echo ""
echo -e "${GREEN}✅ Password hash updated!${NC}"
echo ""

# Restart backend
echo -e "${YELLOW}Restarting backend...${NC}"
pm2 restart license-admin --update-env > /dev/null 2>&1
sleep 2

echo -e "${GREEN}✅ Backend restarted${NC}"
echo ""

# Test login
echo -e "${YELLOW}Testing login...${NC}"
sleep 1

RESPONSE=$(curl -s -X POST https://api.zentryasolutions.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ LOGIN SUCCESSFUL!${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}❌ Still getting HTTP $HTTP_CODE${NC}"
    echo "Response: $BODY"
fi

echo ""

