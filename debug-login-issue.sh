#!/bin/bash
# Debug login issue - check what backend is seeing

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}🔍 DEBUGGING LOGIN ISSUE${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

DEPLOY_PATH="/var/www/license-admin"
DB_NAME="hisaabkitab_license"
DB_USER="postgres"
DB_PASSWORD="Hussn@in0341"

export PGPASSWORD="$DB_PASSWORD"

# ============================================
# STEP 1: CHECK BACKEND LOGS
# ============================================
echo -e "${YELLOW}📋 Step 1: Recent backend logs (login attempts)...${NC}"
echo ""

pm2 logs license-admin --lines 50 --nostream | grep -i "login\|password\|credential\|error\|admin" | tail -20

echo ""

# ============================================
# STEP 2: VERIFY DATABASE STATE
# ============================================
echo -e "${YELLOW}💾 Step 2: Verifying database state...${NC}"
echo ""

psql -h localhost -U $DB_USER -d $DB_NAME << EOF
SELECT 
    username,
    role,
    passwordhash,
    LENGTH(passwordhash) as hash_len,
    LEFT(passwordhash, 30) as hash_start
FROM adminusers 
WHERE username = 'admin';
EOF

echo ""

# ============================================
# STEP 3: TEST PASSWORD VERIFICATION
# ============================================
echo -e "${YELLOW}🧪 Step 3: Testing password verification with backend config...${NC}"
echo ""

cd $DEPLOY_PATH/backend

cat > /tmp/test-password-backend.js << 'TESTEOF'
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
    console.log('Database config:');
    console.log('  Host:', process.env.DB_HOST || 'localhost');
    console.log('  Port:', process.env.DB_PORT || 5432);
    console.log('  Database:', process.env.DB_NAME || 'hisaabkitab_license');
    console.log('  User:', process.env.DB_USER || 'postgres');
    console.log('');
    
    const result = await pool.query(
      'SELECT id, username, passwordhash FROM adminusers WHERE username = $1',
      ['admin']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Admin user not found in database');
      process.exit(1);
    }
    
    const user = result.rows[0];
    const hash = user.passwordhash;
    const password = 'admin123';
    
    console.log('Found user:');
    console.log('  ID:', user.id);
    console.log('  Username:', user.username);
    console.log('  Hash length:', hash ? hash.length : 'NULL');
    console.log('  Hash start:', hash ? hash.substring(0, 30) + '...' : 'NULL');
    console.log('');
    
    if (!hash) {
      console.log('❌ Password hash is NULL');
      process.exit(1);
    }
    
    console.log('Testing password: admin123');
    const isValid = await bcrypt.compare(password, hash);
    
    if (isValid) {
      console.log('✅ Password verification: SUCCESS');
      process.exit(0);
    } else {
      console.log('❌ Password verification: FAILED');
      console.log('');
      console.log('Trying to generate new hash and compare...');
      const newHash = await new Promise((resolve, reject) => {
        bcrypt.hash(password, 10, (err, hash) => {
          if (err) reject(err);
          else resolve(hash);
        });
      });
      console.log('New hash:', newHash);
      const newIsValid = await bcrypt.compare(password, newHash);
      console.log('New hash verification:', newIsValid ? 'SUCCESS' : 'FAILED');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

test();
TESTEOF

node /tmp/test-password-backend.js

rm -f /tmp/test-password-backend.js

echo ""

# ============================================
# STEP 4: CHECK BACKEND .ENV
# ============================================
echo -e "${YELLOW}⚙️  Step 4: Checking backend .env configuration...${NC}"
echo ""

if [ -f "$DEPLOY_PATH/backend/.env" ]; then
    echo "Database configuration in .env:"
    grep "^DB_" "$DEPLOY_PATH/backend/.env" | grep -v "PASSWORD"
    echo "  DB_PASSWORD: [HIDDEN - length: $(grep "^DB_PASSWORD=" "$DEPLOY_PATH/backend/.env" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | wc -c)]"
else
    echo "❌ .env file not found!"
fi

echo ""

# ============================================
# STEP 5: CHECK IF MULTIPLE ADMIN USERS
# ============================================
echo -e "${YELLOW}👥 Step 5: Checking for multiple admin users...${NC}"
echo ""

psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT username, role, LENGTH(passwordhash) as hash_len FROM adminusers ORDER BY username;"

echo ""

# ============================================
# SUMMARY
# ============================================
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}✅ DEBUG COMPLETE!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${YELLOW}Review the output above to identify the issue.${NC}"
echo ""

