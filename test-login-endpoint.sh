#!/bin/bash
# ============================================
# Test Login Endpoint and Check Backend Logs
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
echo -e "${CYAN}🧪 TESTING LOGIN ENDPOINT${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# ============================================
# STEP 1: CHECK BACKEND LOGS
# ============================================
echo -e "${YELLOW}📋 Step 1: Recent backend logs...${NC}"
echo ""

pm2 logs license-admin --lines 30 --nostream | tail -30

echo ""
echo -e "${YELLOW}Press Enter to continue...${NC}"
read

# ============================================
# STEP 2: TEST LOGIN ENDPOINT
# ============================================
echo -e "${YELLOW}🌐 Step 2: Testing login endpoint...${NC}"
echo ""

echo "Testing: POST https://api.zentryasolutions.com/api/admin/login"
echo "Username: admin"
echo "Password: admin123"
echo ""

RESPONSE=$(curl -s -X POST https://api.zentryasolutions.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "HTTP Status Code: $HTTP_CODE"
echo "Response Body:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "   ${GREEN}✅ Login successful!${NC}"
elif [ "$HTTP_CODE" = "401" ]; then
    echo -e "   ${RED}❌ Invalid credentials (401)${NC}"
    echo ""
    echo -e "   ${YELLOW}Checking database directly...${NC}"
    
    export PGPASSWORD="Hussn@in0341"
    psql -h localhost -U postgres -d hisaabkitab_license << EOF
SELECT 
    username,
    role,
    passwordhash,
    LENGTH(passwordhash) as hash_len
FROM adminusers 
WHERE username = 'admin';
EOF
    
elif [ "$HTTP_CODE" = "503" ]; then
    echo -e "   ${YELLOW}⚠️  Service unavailable (503) - might be 2FA email issue${NC}"
else
    echo -e "   ${YELLOW}⚠️  Got HTTP $HTTP_CODE${NC}"
fi

echo ""

# ============================================
# STEP 3: TEST PASSWORD HASH DIRECTLY
# ============================================
echo -e "${YELLOW}🔐 Step 3: Testing password hash directly...${NC}"
echo ""

cd /var/www/license-admin/backend

cat > /tmp/test-hash.js << 'TESTEOF'
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

async function testPassword() {
  try {
    const result = await pool.query(
      'SELECT id, username, passwordhash FROM adminusers WHERE username = $1',
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
    console.log('Hash length:', hash ? hash.length : 'NULL');
    console.log('Hash preview:', hash ? hash.substring(0, 30) + '...' : 'NULL');
    
    if (!hash) {
      console.log('❌ Password hash is NULL');
      process.exit(1);
    }
    
    const isValid = await bcrypt.compare(password, hash);
    
    if (isValid) {
      console.log('✅ Password verification: SUCCESS');
      process.exit(0);
    } else {
      console.log('❌ Password verification: FAILED');
      console.log('   Password: admin123');
      console.log('   Hash: ' + hash.substring(0, 30) + '...');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testPassword();
TESTEOF

if node /tmp/test-hash.js; then
    echo -e "   ${GREEN}✅ Password hash works with backend configuration${NC}"
else
    echo -e "   ${RED}❌ Password hash verification failed!${NC}"
    echo ""
    echo -e "   ${YELLOW}This means the hash in database doesn't match 'admin123'${NC}"
    echo -e "   ${YELLOW}Let's regenerate it...${NC}"
    
    # Generate new hash
    cat > /tmp/generate-hash.js << 'GENEOF'
const bcrypt = require('bcryptjs');
bcrypt.hash('admin123', 10, (err, hash) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  console.log('New hash:', hash);
  process.exit(0);
});
GENEOF
    
    NEW_HASH=$(node /tmp/generate-hash.js 2>/dev/null | grep -v "New hash:")
    
    if [ -n "$NEW_HASH" ]; then
        echo "   Generated new hash: $NEW_HASH"
        export PGPASSWORD="Hussn@in0341"
        psql -h localhost -U postgres -d hisaabkitab_license -c "UPDATE adminusers SET passwordhash = '$NEW_HASH' WHERE username = 'admin';"
        echo -e "   ${GREEN}✅ Updated password hash in database${NC}"
    fi
fi

rm -f /tmp/test-hash.js /tmp/generate-hash.js

echo ""

# ============================================
# STEP 4: CHECK BACKEND ERROR LOGS
# ============================================
echo -e "${YELLOW}📋 Step 4: Checking backend error logs...${NC}"
echo ""

if [ -f "/var/www/license-admin/backend/logs/error.log" ]; then
    echo "Last 20 lines of error.log:"
    tail -20 /var/www/license-admin/backend/logs/error.log
else
    echo "Error log file not found"
fi

echo ""

# ============================================
# SUMMARY
# ============================================
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}✅ TEST COMPLETE!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "   1. If login returned 401, check the password hash above"
echo "   2. If hash was regenerated, try logging in again"
echo "   3. Check backend logs: pm2 logs license-admin --lines 50"
echo ""
echo -e "${GREEN}🎉 Done!${NC}"
echo ""

