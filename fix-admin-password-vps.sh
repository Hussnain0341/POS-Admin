#!/bin/bash
# ============================================
# Fix Admin Password in Database
# Checks and fixes admin user password hash
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
echo -e "${CYAN}🔐 FIXING ADMIN PASSWORD${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Configuration
DB_NAME="hisaabkitab_license"
DB_USER="postgres"
DB_PASSWORD="Hussn@in0341"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin123"
# Bcrypt hash for "admin123" - $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
ADMIN_HASH='$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'

export PGPASSWORD="$DB_PASSWORD"

# ============================================
# STEP 1: CHECK DATABASE CONNECTION
# ============================================
echo -e "${YELLOW}🔍 Step 1: Checking database connection...${NC}"

if ! psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "   ${RED}❌ Cannot connect to database!${NC}"
    echo "   Please check:"
    echo "   - Database name: $DB_NAME"
    echo "   - Database user: $DB_USER"
    echo "   - Database password: $DB_PASSWORD"
    exit 1
fi

echo -e "   ${GREEN}✅ Database connection successful${NC}"
echo ""

# ============================================
# STEP 2: CHECK IF ADMIN USER EXISTS
# ============================================
echo -e "${YELLOW}👤 Step 2: Checking if admin user exists...${NC}"

USER_EXISTS=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM adminusers WHERE username = '$ADMIN_USERNAME';" | xargs)

if [ "$USER_EXISTS" = "0" ]; then
    echo -e "   ${YELLOW}⚠️  Admin user does not exist. Creating...${NC}"
    
    psql -h localhost -U $DB_USER -d $DB_NAME << EOF
INSERT INTO adminusers (username, passwordhash, role)
VALUES ('$ADMIN_USERNAME', '$ADMIN_HASH', 'superadmin');
EOF
    
    echo -e "   ${GREEN}✅ Admin user created${NC}"
else
    echo -e "   ${GREEN}✅ Admin user exists${NC}"
fi

echo ""

# ============================================
# STEP 3: CHECK CURRENT PASSWORD HASH
# ============================================
echo -e "${YELLOW}🔍 Step 3: Checking current password hash...${NC}"

CURRENT_HASH=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "SELECT passwordhash FROM adminusers WHERE username = '$ADMIN_USERNAME';" | xargs)

if [ -z "$CURRENT_HASH" ] || [ "$CURRENT_HASH" = "NULL" ] || [ "$CURRENT_HASH" = "" ]; then
    echo -e "   ${RED}❌ Password hash is NULL or empty!${NC}"
    echo -e "   ${YELLOW}   Fixing...${NC}"
    
    psql -h localhost -U $DB_USER -d $DB_NAME << EOF
UPDATE adminusers 
SET passwordhash = '$ADMIN_HASH'
WHERE username = '$ADMIN_USERNAME';
EOF
    
    echo -e "   ${GREEN}✅ Password hash updated${NC}"
elif [ "$CURRENT_HASH" != "$ADMIN_HASH" ]; then
    echo -e "   ${YELLOW}⚠️  Password hash doesn't match expected value${NC}"
    echo -e "   ${YELLOW}   Current hash: ${CURRENT_HASH:0:20}...${NC}"
    echo -e "   ${YELLOW}   Updating to correct hash...${NC}"
    
    psql -h localhost -U $DB_USER -d $DB_NAME << EOF
UPDATE adminusers 
SET passwordhash = '$ADMIN_HASH'
WHERE username = '$ADMIN_USERNAME';
EOF
    
    echo -e "   ${GREEN}✅ Password hash updated${NC}"
else
    echo -e "   ${GREEN}✅ Password hash is correct${NC}"
fi

echo ""

# ============================================
# STEP 4: VERIFY ADMIN USER
# ============================================
echo -e "${YELLOW}✅ Step 4: Verifying admin user...${NC}"

psql -h localhost -U $DB_USER -d $DB_NAME << EOF
SELECT 
    username,
    role,
    CASE 
        WHEN passwordhash IS NOT NULL AND passwordhash != '' THEN 'Password hash exists'
        ELSE 'Password hash is NULL'
    END as password_status,
    LENGTH(passwordhash) as hash_length,
    LEFT(passwordhash, 20) as hash_preview
FROM adminusers 
WHERE username = '$ADMIN_USERNAME';
EOF

echo ""

# ============================================
# STEP 5: TEST PASSWORD HASH
# ============================================
echo -e "${YELLOW}🧪 Step 5: Testing password hash format...${NC}"

HASH_CHECK=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "SELECT passwordhash FROM adminusers WHERE username = '$ADMIN_USERNAME';" | xargs)

if [[ $HASH_CHECK == \$2a\$* ]] || [[ $HASH_CHECK == \$2b\$* ]] || [[ $HASH_CHECK == \$2y\$* ]]; then
    echo -e "   ${GREEN}✅ Password hash format is correct (bcrypt)${NC}"
    echo -e "   ${GREEN}   Hash starts with: ${HASH_CHECK:0:7}${NC}"
else
    echo -e "   ${RED}❌ Password hash format is incorrect!${NC}"
    echo -e "   ${YELLOW}   Expected: \$2a\$10\$...${NC}"
    echo -e "   ${YELLOW}   Got: ${HASH_CHECK:0:20}...${NC}"
    echo -e "   ${YELLOW}   Fixing...${NC}"
    
    psql -h localhost -U $DB_USER -d $DB_NAME << EOF
UPDATE adminusers 
SET passwordhash = '$ADMIN_HASH'
WHERE username = '$ADMIN_USERNAME';
EOF
    
    echo -e "   ${GREEN}✅ Password hash fixed${NC}"
fi

echo ""

# ============================================
# STEP 6: CHECK TABLE STRUCTURE
# ============================================
echo -e "${YELLOW}📊 Step 6: Checking table structure...${NC}"

psql -h localhost -U $DB_USER -d $DB_NAME << EOF
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'adminusers'
ORDER BY ordinal_position;
EOF

echo ""

# ============================================
# SUMMARY
# ============================================
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}✅ ADMIN PASSWORD FIXED!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${BLUE}🔐 Login Credentials:${NC}"
echo -e "   Username: ${CYAN}$ADMIN_USERNAME${NC}"
echo -e "   Password: ${CYAN}$ADMIN_PASSWORD${NC}"
echo ""
echo -e "${BLUE}📝 What was done:${NC}"
echo "   ✓ Checked database connection"
echo "   ✓ Verified admin user exists"
echo "   ✓ Fixed password hash if needed"
echo "   ✓ Verified hash format"
echo ""
echo -e "${YELLOW}⚠️  Next Steps:${NC}"
echo "   1. Restart backend: pm2 restart license-admin"
echo "   2. Try logging in at: https://api.zentryasolutions.com/login"
echo "   3. If still not working, check backend logs: pm2 logs license-admin"
echo ""
echo -e "${GREEN}🎉 Done!${NC}"
echo ""

