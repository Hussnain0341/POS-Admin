#!/bin/bash
# ============================================
# Comprehensive Login Diagnostic and Fix
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
echo -e "${CYAN}🔍 LOGIN DIAGNOSTIC & FIX${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

DEPLOY_PATH="/var/www/license-admin"
DB_NAME="hisaabkitab_license"
DB_USER="postgres"
DB_PASSWORD="Hussn@in0341"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin123"
ADMIN_HASH='$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'

export PGPASSWORD="$DB_PASSWORD"

# ============================================
# STEP 1: CHECK DATABASE CONNECTION
# ============================================
echo -e "${YELLOW}📊 Step 1: Database Connection${NC}"

if psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Database connection: OK${NC}"
else
    echo -e "   ${RED}❌ Cannot connect to database!${NC}"
    echo ""
    echo "   Trying alternative database names..."
    
    # Try common database names
    for alt_db in "license_admin" "hisaabkitab_license" "postgres"; do
        if psql -h localhost -U $DB_USER -d $alt_db -c "SELECT 1;" > /dev/null 2>&1; then
            echo -e "   ${GREEN}✅ Found database: $alt_db${NC}"
            DB_NAME=$alt_db
            break
        fi
    done
    
    if [ "$DB_NAME" != "hisaabkitab_license" ]; then
        echo -e "   ${YELLOW}⚠️  Using database: $DB_NAME${NC}"
    fi
fi

echo ""

# ============================================
# STEP 2: CHECK TABLE EXISTS
# ============================================
echo -e "${YELLOW}📋 Step 2: Checking adminusers table...${NC}"

TABLE_EXISTS=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'adminusers');" | xargs)

if [ "$TABLE_EXISTS" = "t" ]; then
    echo -e "   ${GREEN}✅ Table 'adminusers' exists${NC}"
else
    echo -e "   ${RED}❌ Table 'adminusers' does not exist!${NC}"
    echo -e "   ${YELLOW}   Creating table...${NC}"
    
    psql -h localhost -U $DB_USER -d $DB_NAME << EOF
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS adminusers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    passwordhash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF
    
    echo -e "   ${GREEN}✅ Table created${NC}"
fi

echo ""

# ============================================
# STEP 3: CHECK ADMIN USER
# ============================================
echo -e "${YELLOW}👤 Step 3: Checking admin user...${NC}"

# Check with lowercase (PostgreSQL is case-sensitive for unquoted identifiers)
USER_EXISTS=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM adminusers WHERE LOWER(username) = LOWER('$ADMIN_USERNAME');" | xargs)

if [ "$USER_EXISTS" = "0" ]; then
    echo -e "   ${RED}❌ Admin user does not exist!${NC}"
    echo -e "   ${YELLOW}   Creating admin user...${NC}"
    
    psql -h localhost -U $DB_USER -d $DB_NAME << EOF
INSERT INTO adminusers (username, passwordhash, role)
VALUES ('$ADMIN_USERNAME', '$ADMIN_HASH', 'superadmin')
ON CONFLICT (username) DO NOTHING;
EOF
    
    echo -e "   ${GREEN}✅ Admin user created${NC}"
else
    echo -e "   ${GREEN}✅ Admin user exists${NC}"
fi

echo ""

# ============================================
# STEP 4: FIX PASSWORD HASH
# ============================================
echo -e "${YELLOW}🔐 Step 4: Fixing password hash...${NC}"

# Get current hash
CURRENT_HASH=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "SELECT passwordhash FROM adminusers WHERE LOWER(username) = LOWER('$ADMIN_USERNAME');" | xargs)

if [ -z "$CURRENT_HASH" ] || [ "$CURRENT_HASH" = "NULL" ] || [ "$CURRENT_HASH" = "" ]; then
    echo -e "   ${RED}❌ Password hash is NULL!${NC}"
    echo -e "   ${YELLOW}   Setting correct hash...${NC}"
    
    psql -h localhost -U $DB_USER -d $DB_NAME << EOF
UPDATE adminusers 
SET passwordhash = '$ADMIN_HASH'
WHERE LOWER(username) = LOWER('$ADMIN_USERNAME');
EOF
    
    echo -e "   ${GREEN}✅ Password hash set${NC}"
elif [ "$CURRENT_HASH" != "$ADMIN_HASH" ]; then
    echo -e "   ${YELLOW}⚠️  Password hash doesn't match${NC}"
    echo -e "   ${YELLOW}   Updating to correct hash...${NC}"
    
    psql -h localhost -U $DB_USER -d $DB_NAME << EOF
UPDATE adminusers 
SET passwordhash = '$ADMIN_HASH'
WHERE LOWER(username) = LOWER('$ADMIN_USERNAME');
EOF
    
    echo -e "   ${GREEN}✅ Password hash updated${NC}"
else
    echo -e "   ${GREEN}✅ Password hash is correct${NC}"
fi

echo ""

# ============================================
# STEP 5: VERIFY PASSWORD HASH FORMAT
# ============================================
echo -e "${YELLOW}🔍 Step 5: Verifying password hash format...${NC}"

FINAL_HASH=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "SELECT passwordhash FROM adminusers WHERE LOWER(username) = LOWER('$ADMIN_USERNAME');" | xargs)

if [[ $FINAL_HASH == \$2a\$* ]] || [[ $FINAL_HASH == \$2b\$* ]] || [[ $FINAL_HASH == \$2y\$* ]]; then
    HASH_LENGTH=${#FINAL_HASH}
    if [ "$HASH_LENGTH" -eq 60 ]; then
        echo -e "   ${GREEN}✅ Hash format: Correct (bcrypt, 60 chars)${NC}"
        echo -e "   ${GREEN}   Hash preview: ${FINAL_HASH:0:20}...${NC}"
    else
        echo -e "   ${RED}❌ Hash length incorrect: $HASH_LENGTH (expected 60)${NC}"
    fi
else
    echo -e "   ${RED}❌ Hash format incorrect!${NC}"
    echo -e "   ${YELLOW}   Expected: \$2a\$10\$...${NC}"
    echo -e "   ${YELLOW}   Got: ${FINAL_HASH:0:20}...${NC}"
fi

echo ""

# ============================================
# STEP 6: TEST PASSWORD VERIFICATION
# ============================================
echo -e "${YELLOW}🧪 Step 6: Testing password verification...${NC}"

cd $DEPLOY_PATH/backend

# Create test script
cat > /tmp/test-password.js << 'TESTEOF'
const bcrypt = require('bcryptjs');
const hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
const password = 'admin123';

bcrypt.compare(password, hash, (err, result) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  if (result) {
    console.log('✅ Password verification: SUCCESS');
    process.exit(0);
  } else {
    console.error('❌ Password verification: FAILED');
    process.exit(1);
  }
});
TESTEOF

if node /tmp/test-password.js 2>/dev/null; then
    echo -e "   ${GREEN}✅ Password verification works${NC}"
else
    echo -e "   ${RED}❌ Password verification failed!${NC}"
    echo -e "   ${YELLOW}   Installing bcryptjs...${NC}"
    npm install bcryptjs > /dev/null 2>&1
    if node /tmp/test-password.js 2>/dev/null; then
        echo -e "   ${GREEN}✅ Password verification works after install${NC}"
    fi
fi

rm -f /tmp/test-password.js

echo ""

# ============================================
# STEP 7: CHECK BACKEND CONFIGURATION
# ============================================
echo -e "${YELLOW}⚙️  Step 7: Checking backend configuration...${NC}"

cd $DEPLOY_PATH

if [ -f "backend/.env" ]; then
    echo "   Backend .env file exists"
    
    DB_NAME_ENV=$(grep "^DB_NAME=" backend/.env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
    DB_USER_ENV=$(grep "^DB_USER=" backend/.env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
    
    echo "   DB_NAME in .env: ${DB_NAME_ENV:-not set}"
    echo "   DB_USER in .env: ${DB_USER_ENV:-not set}"
    
    if [ -n "$DB_NAME_ENV" ] && [ "$DB_NAME_ENV" != "$DB_NAME" ]; then
        echo -e "   ${YELLOW}⚠️  Database name mismatch!${NC}"
        echo -e "   ${YELLOW}   .env has: $DB_NAME_ENV${NC}"
        echo -e "   ${YELLOW}   Database has: $DB_NAME${NC}"
        echo -e "   ${YELLOW}   Updating .env...${NC}"
        sed -i "s/^DB_NAME=.*/DB_NAME=$DB_NAME/" backend/.env
        echo -e "   ${GREEN}✅ .env updated${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  backend/.env file not found!${NC}"
fi

echo ""

# ============================================
# STEP 8: SHOW CURRENT ADMIN USER STATUS
# ============================================
echo -e "${YELLOW}📊 Step 8: Current admin user status${NC}"

psql -h localhost -U $DB_USER -d $DB_NAME << EOF
SELECT 
    username,
    role,
    CASE 
        WHEN passwordhash IS NOT NULL AND passwordhash != '' THEN 'Hash exists'
        ELSE 'Hash is NULL'
    END as password_status,
    LENGTH(passwordhash) as hash_length,
    LEFT(passwordhash, 25) as hash_preview
FROM adminusers 
WHERE LOWER(username) = LOWER('$ADMIN_USERNAME');
EOF

echo ""

# ============================================
# STEP 9: RESTART BACKEND
# ============================================
echo -e "${YELLOW}🔄 Step 9: Restarting backend...${NC}"

if pm2 list | grep -q "license-admin"; then
    pm2 restart license-admin --update-env > /dev/null 2>&1
    sleep 2
    if pm2 list | grep -q "license-admin.*online"; then
        echo -e "   ${GREEN}✅ Backend restarted and running${NC}"
    else
        echo -e "   ${RED}❌ Backend failed to start!${NC}"
        echo "   Check logs: pm2 logs license-admin"
    fi
else
    echo -e "   ${YELLOW}⚠️  Backend not running, starting...${NC}"
    pm2 start ecosystem.config.js --env production > /dev/null 2>&1
    pm2 save > /dev/null 2>&1
fi

echo ""

# ============================================
# SUMMARY
# ============================================
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}✅ DIAGNOSTIC COMPLETE!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${BLUE}🔐 Login Credentials:${NC}"
echo -e "   Username: ${CYAN}$ADMIN_USERNAME${NC}"
echo -e "   Password: ${CYAN}$ADMIN_PASSWORD${NC}"
echo ""
echo -e "${BLUE}📊 Database Info:${NC}"
echo -e "   Database: ${CYAN}$DB_NAME${NC}"
echo -e "   User: ${CYAN}$DB_USER${NC}"
echo ""
echo -e "${BLUE}🌐 Test Login:${NC}"
echo "   URL: https://api.zentryasolutions.com/login"
echo ""
echo -e "${YELLOW}⚠️  If still not working:${NC}"
echo "   1. Check backend logs: pm2 logs license-admin --lines 50"
echo "   2. Verify database connection: psql -h localhost -U postgres -d $DB_NAME"
echo "   3. Check .env file: cat backend/.env | grep DB_"
echo ""
echo -e "${GREEN}🎉 Done!${NC}"
echo ""

