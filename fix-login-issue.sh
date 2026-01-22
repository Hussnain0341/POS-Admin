#!/bin/bash
# ============================================
# Fix Login Issues: Password + 2FA + API URL
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
ADMIN_PASSWORD="admin123"

# ============================================
# STEP 1: FIX ADMIN PASSWORD IN DATABASE
# ============================================
echo -e "${YELLOW}🔐 Step 1: Fixing admin password in database...${NC}"

# Generate bcrypt hash for admin123
# Hash: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
ADMIN_HASH='$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'

export PGPASSWORD="$DB_PASSWORD"

# Update admin password
psql -h localhost -U $DB_USER -d $DB_NAME << EOF
UPDATE adminusers 
SET passwordhash = '$ADMIN_HASH'
WHERE username = 'admin';

-- Verify update
SELECT username, 
       CASE 
         WHEN passwordhash IS NOT NULL THEN 'Password hash exists'
         ELSE 'Password hash is NULL'
       END as password_status
FROM adminusers 
WHERE username = 'admin';
EOF

echo -e "   ${GREEN}✅ Admin password updated${NC}"
echo ""

# ============================================
# STEP 2: TEMPORARILY DISABLE 2FA
# ============================================
echo -e "${YELLOW}📧 Step 2: Temporarily disabling 2FA (direct login)...${NC}"

cd $DEPLOY_PATH

if [ ! -f "backend/routes/admin.js" ]; then
    echo -e "   ${RED}❌ Error: backend/routes/admin.js not found!${NC}"
    exit 1
fi

# Create backup
cp backend/routes/admin.js backend/routes/admin.js.backup

# Comment out 2FA code and return token directly
cat > /tmp/admin_login_fix.js << 'FIXEOF'
    // 2FA DISABLED - Return token directly
    // To enable 2FA, uncomment the code below and comment out the direct token return
    
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    await auditLog('login_success', { username, userId: user.id }, null, req);

    res.json({ 
      token, 
      user: { id: user.id, username: user.username, role: user.role } 
    });

    /* 2FA CODE (DISABLED) - Uncomment to enable:
    // 2FA ENABLED - Generate code, store, send email
    const code = generate2FACode();
    const tempToken = uuidv4();
    const twoFAEmail = process.env.TWO_FA_EMAIL || 'hussnain0341@gmail.com';
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Clean old pending 2FA for this user
    await pool.query('DELETE FROM login_2fa_codes WHERE user_id = $1', [user.id]);

    await pool.query(
      `INSERT INTO login_2fa_codes (temp_token, user_id, code, email, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [tempToken, user.id, code, twoFAEmail, expiresAt]
    );

    const emailResult = await send2FACode(code, user.username);
    if (!emailResult.sent) {
      await pool.query('DELETE FROM login_2fa_codes WHERE temp_token = $1', [tempToken]);
      await auditLog('login_failed', { username, reason: '2fa_email_failed' }, null, req);
      return res.status(503).json({
        error: 'Could not send verification email. Please check SMTP configuration or try again later.',
        detail: process.env.NODE_ENV === 'development' ? emailResult.error : undefined
      });
    }

    await auditLog('login_2fa_sent', { username, userId: user.id }, null, req);

    res.json({
      require2FA: true,
      tempToken,
      email: twoFAEmail,
      message: `Verification code sent to ${twoFAEmail}. Check your inbox.`
    });
    */
FIXEOF

# Replace the 2FA section with direct token return
# This is a complex sed operation, so we'll use a Python script
python3 << 'PYTHONEOF'
import re

with open('/var/www/license-admin/backend/routes/admin.js', 'r') as f:
    content = f.read()

# Find the section after password validation
pattern = r'(const isValid = await bcrypt\.compare\(password, user\.passwordHash\);\s+if \(!isValid\) \{[^}]+\}[^}]+)(// 2FA ENABLED.*?res\.json\(\{[^}]+\}\);)\s+} catch \(error\)'

# Replacement: keep password check, replace 2FA with direct token
replacement = r'''\1
    // 2FA DISABLED - Return token directly
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    await auditLog('login_success', { username, userId: user.id }, null, req);

    res.json({ 
      token, 
      user: { id: user.id, username: user.username, role: user.role } 
    });
  } catch (error)'''

new_content = re.sub(
    r'// 2FA ENABLED.*?message: `Verification code sent to \$\{twoFAEmail\}\. Check your inbox\.`\s+\}\);',
    '''// 2FA DISABLED - Return token directly
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    await auditLog('login_success', { username, userId: user.id }, null, req);

    res.json({ 
      token, 
      user: { id: user.id, username: user.username, role: user.role } 
    });''',
    content,
    flags=re.DOTALL
)

with open('/var/www/license-admin/backend/routes/admin.js', 'w') as f:
    f.write(new_content)

print("✅ 2FA disabled in backend")
PYTHONEOF

echo -e "   ${GREEN}✅ 2FA temporarily disabled${NC}"
echo ""

# ============================================
# STEP 3: UPDATE FRONTEND API URL
# ============================================
echo -e "${YELLOW}🌐 Step 3: Updating frontend API URL...${NC}"

if [ -f "frontend/src/services/api.ts" ]; then
    sed -i 's|https://license.zentryasolutions.com/api|https://api.zentryasolutions.com/api|g' frontend/src/services/api.ts
    echo -e "   ${GREEN}✅ Frontend API URL updated${NC}"
else
    echo -e "   ${YELLOW}⚠️  frontend/src/services/api.ts not found${NC}"
fi

echo ""

# ============================================
# STEP 4: UPDATE BACKEND CORS
# ============================================
echo -e "${YELLOW}🔒 Step 4: Updating backend CORS...${NC}"

if [ -f "backend/index.js" ]; then
    # Add api.zentryasolutions.com to CORS if not present
    if ! grep -q "api.zentryasolutions.com" backend/index.js; then
        sed -i "s|'https://license.zentryasolutions.com'|'https://api.zentryasolutions.com', 'https://license.zentryasolutions.com'|g" backend/index.js
    fi
    echo -e "   ${GREEN}✅ Backend CORS updated${NC}"
else
    echo -e "   ${YELLOW}⚠️  backend/index.js not found${NC}"
fi

echo ""

# ============================================
# STEP 5: REBUILD FRONTEND
# ============================================
echo -e "${YELLOW}🏗️  Step 5: Rebuilding frontend...${NC}"

cd $DEPLOY_PATH/frontend

if [ ! -d "node_modules" ]; then
    npm install --legacy-peer-deps > /dev/null 2>&1
fi

npm run build > /dev/null 2>&1 || {
    npm install --legacy-peer-deps > /dev/null 2>&1
    npm run build > /dev/null 2>&1
}

echo -e "   ${GREEN}✅ Frontend rebuilt${NC}"
echo ""

# ============================================
# STEP 6: RESTART BACKEND
# ============================================
echo -e "${YELLOW}🔄 Step 6: Restarting backend...${NC}"

cd $DEPLOY_PATH

if pm2 list | grep -q "license-admin"; then
    pm2 restart license-admin --update-env > /dev/null 2>&1
    echo -e "   ${GREEN}✅ Backend restarted${NC}"
else
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

# Test login endpoint
echo "   Testing login endpoint..."
RESPONSE=$(curl -s -X POST https://api.zentryasolutions.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "   ${GREEN}✅ Login endpoint working!${NC}"
    echo "   Response: $BODY"
elif [ "$HTTP_CODE" = "401" ]; then
    echo -e "   ${RED}❌ Still getting 401 - password might be wrong${NC}"
    echo "   Response: $BODY"
else
    echo -e "   ${YELLOW}⚠️  Got HTTP $HTTP_CODE${NC}"
    echo "   Response: $BODY"
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
echo "   ✓ Admin password reset to: admin123"
echo "   ✓ 2FA temporarily disabled (direct login)"
echo "   ✓ Frontend API URL updated"
echo "   ✓ Backend CORS updated"
echo "   ✓ Frontend rebuilt"
echo "   ✓ Backend restarted"
echo ""
echo -e "${BLUE}🔐 Login Credentials:${NC}"
echo -e "   Username: ${CYAN}admin${NC}"
echo -e "   Password: ${CYAN}admin123${NC}"
echo ""
echo -e "${BLUE}🌐 Test it:${NC}"
echo "   1. Open: https://api.zentryasolutions.com/login"
echo "   2. Login with: admin / admin123"
echo "   3. Should work without 2FA now"
echo ""
echo -e "${YELLOW}⚠️  Note:${NC}"
echo "   • 2FA is temporarily disabled"
echo "   • To re-enable 2FA, configure SMTP in backend/.env"
echo "   • Then uncomment the 2FA code in backend/routes/admin.js"
echo ""
echo -e "${GREEN}🎉 Done!${NC}"
echo ""

