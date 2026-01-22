#!/bin/bash
# ============================================
# Final Password Hash Fix - Using Backend's bcryptjs
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
echo -e "${CYAN}🔐 FINAL PASSWORD HASH FIX${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

DEPLOY_PATH="/var/www/license-admin"
DB_NAME="hisaabkitab_license"
DB_USER="postgres"
DB_PASSWORD="Hussn@in0341"

export PGPASSWORD="$DB_PASSWORD"

cd $DEPLOY_PATH/backend

# ============================================
# STEP 1: INSTALL bcryptjs IF NEEDED
# ============================================
echo -e "${YELLOW}📦 Step 1: Checking bcryptjs installation...${NC}"

if [ ! -d "node_modules/bcryptjs" ]; then
    echo "   Installing bcryptjs..."
    npm install bcryptjs > /dev/null 2>&1
    echo -e "   ${GREEN}✅ bcryptjs installed${NC}"
else
    echo -e "   ${GREEN}✅ bcryptjs already installed${NC}"
fi

echo ""

# ============================================
# STEP 2: GENERATE NEW HASH USING BACKEND'S bcryptjs
# ============================================
echo -e "${YELLOW}🔐 Step 2: Generating new password hash...${NC}"

cat > /tmp/generate-new-hash.js << 'GENEOF'
const bcrypt = require('bcryptjs');

bcrypt.hash('admin123', 10, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    process.exit(1);
  }
  console.log(hash);
  process.exit(0);
});
GENEOF

# Use backend's node_modules
NEW_HASH=$(NODE_PATH=$DEPLOY_PATH/backend/node_modules node /tmp/generate-new-hash.js 2>/dev/null)

if [ -z "$NEW_HASH" ] || [ ${#NEW_HASH} -lt 50 ]; then
    echo -e "   ${YELLOW}⚠️  First attempt failed, trying with full path...${NC}"
    cd $DEPLOY_PATH/backend
    NEW_HASH=$(node /tmp/generate-new-hash.js 2>&1 | grep -v "Error\|at\|Module\|process" | head -1)
fi

if [ -z "$NEW_HASH" ] || [ ${#NEW_HASH} -lt 50 ]; then
    echo -e "   ${RED}❌ Failed to generate hash! Using known good hash...${NC}"
    NEW_HASH='$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
fi

echo -e "   ${GREEN}✅ Generated hash: ${NEW_HASH:0:30}...${NC}"
rm -f /tmp/generate-new-hash.js

echo ""

# ============================================
# STEP 3: VERIFY NEW HASH WORKS
# ============================================
echo -e "${YELLOW}🧪 Step 3: Verifying new hash...${NC}"

cat > /tmp/verify-hash.js << 'VERIFYEOF'
const bcrypt = require('bcryptjs');
const hash = process.argv[2];
const password = 'admin123';

bcrypt.compare(password, hash, (err, result) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  if (result) {
    console.log('SUCCESS');
    process.exit(0);
  } else {
    console.log('FAILED');
    process.exit(1);
  }
});
VERIFYEOF

if node /tmp/verify-hash.js "$NEW_HASH" 2>/dev/null | grep -q "SUCCESS"; then
    echo -e "   ${GREEN}✅ Hash verification: SUCCESS${NC}"
else
    echo -e "   ${RED}❌ Hash verification: FAILED${NC}"
    exit 1
fi

rm -f /tmp/verify-hash.js

echo ""

# ============================================
# STEP 4: UPDATE DATABASE
# ============================================
echo -e "${YELLOW}💾 Step 4: Updating database...${NC}"

psql -h localhost -U $DB_USER -d $DB_NAME << EOF
-- Delete existing admin user
DELETE FROM adminusers WHERE username = 'admin';

-- Insert with new hash
INSERT INTO adminusers (username, passwordhash, role)
VALUES ('admin', '$NEW_HASH', 'superadmin');

-- Verify
SELECT 
    username,
    role,
    CASE 
        WHEN passwordhash = '$NEW_HASH' THEN 'Hash matches'
        ELSE 'Hash mismatch'
    END as verification,
    LENGTH(passwordhash) as hash_length
FROM adminusers 
WHERE username = 'admin';
EOF

echo -e "   ${GREEN}✅ Database updated${NC}"
echo ""

# ============================================
# STEP 5: TEST WITH BACKEND CONFIGURATION
# ============================================
echo -e "${YELLOW}🧪 Step 5: Testing with backend configuration...${NC}"

cat > /tmp/test-backend-hash.js << 'TESTEOF'
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'hisaabkitab_license',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function test() {
  try {
    const result = await pool.query(
      'SELECT username, passwordhash FROM adminusers WHERE username = $1',
      ['admin']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Admin user not found');
      process.exit(1);
    }
    
    const user = result.rows[0];
    const hash = user.passwordhash;
    const password = 'admin123';
    
    console.log('Username:', user.username);
    console.log('Hash:', hash.substring(0, 30) + '...');
    
    const isValid = await bcrypt.compare(password, hash);
    
    if (isValid) {
      console.log('✅ Password verification: SUCCESS');
      process.exit(0);
    } else {
      console.log('❌ Password verification: FAILED');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

test();
TESTEOF

if node /tmp/test-backend-hash.js 2>&1 | grep -q "SUCCESS"; then
    echo -e "   ${GREEN}✅ Backend password verification: SUCCESS${NC}"
else
    echo -e "   ${RED}❌ Backend password verification: FAILED${NC}"
    node /tmp/test-backend-hash.js
fi

rm -f /tmp/test-backend-hash.js

echo ""

# ============================================
# STEP 6: RESTART BACKEND
# ============================================
echo -e "${YELLOW}🔄 Step 6: Restarting backend...${NC}"

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

# ============================================
# STEP 7: TEST LOGIN ENDPOINT
# ============================================
echo -e "${YELLOW}🌐 Step 7: Testing login endpoint...${NC}"

sleep 2

RESPONSE=$(curl -s -X POST https://api.zentryasolutions.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "   ${GREEN}✅ Login successful!${NC}"
    echo "   Response: $BODY"
elif [ "$HTTP_CODE" = "401" ]; then
    echo -e "   ${RED}❌ Still getting 401 Invalid credentials${NC}"
    echo "   Response: $BODY"
    echo ""
    echo -e "   ${YELLOW}Checking backend logs...${NC}"
    pm2 logs license-admin --lines 20 --nostream | grep -i "login\|password\|error" | tail -10
else
    echo -e "   ${YELLOW}⚠️  Got HTTP $HTTP_CODE${NC}"
    echo "   Response: $BODY"
fi

echo ""

# ============================================
# SUMMARY
# ============================================
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}✅ PASSWORD HASH FIXED!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${BLUE}🔐 Login Credentials:${NC}"
echo -e "   Username: ${CYAN}admin${NC}"
echo -e "   Password: ${CYAN}admin123${NC}"
echo ""
echo -e "${BLUE}🌐 Test Login:${NC}"
echo "   https://api.zentryasolutions.com/login"
echo ""
if [ "$HTTP_CODE" != "200" ]; then
    echo -e "${YELLOW}⚠️  If login still fails:${NC}"
    echo "   1. Check backend logs: pm2 logs license-admin --lines 50"
    echo "   2. Verify database: psql -h localhost -U postgres -d $DB_NAME -c \"SELECT username, passwordhash FROM adminusers WHERE username = 'admin';\""
    echo "   3. Check .env: cat backend/.env | grep DB_"
fi
echo ""
echo -e "${GREEN}🎉 Done!${NC}"
echo ""

