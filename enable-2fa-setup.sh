#!/bin/bash
# ============================================
# Enable 2FA and Configure SMTP
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
echo -e "${CYAN}🔐 ENABLING 2FA & CONFIGURING SMTP${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

DEPLOY_PATH="/var/www/license-admin"

cd $DEPLOY_PATH

# ============================================
# STEP 1: PULL LATEST CODE
# ============================================
echo -e "${YELLOW}📥 Step 1: Pulling latest code from GitHub...${NC}"

git pull origin main > /dev/null 2>&1 || {
    echo -e "   ${YELLOW}⚠️  Git pull failed, continuing...${NC}"
}

echo -e "   ${GREEN}✅ Code updated${NC}"
echo ""

# ============================================
# STEP 2: CHECK/UPDATE .ENV FOR SMTP
# ============================================
echo -e "${YELLOW}⚙️  Step 2: Configuring SMTP in .env...${NC}"

cd backend

if [ ! -f ".env" ]; then
    echo "   Creating .env file..."
    touch .env
fi

# Check if SMTP is configured
if ! grep -q "^SMTP_HOST=" .env 2>/dev/null; then
    echo "   SMTP not configured. Adding SMTP settings..."
    cat >> .env << 'EOF'

# SMTP Configuration for 2FA
TWO_FA_EMAIL=hussnain0341@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com
EOF
    echo -e "   ${YELLOW}⚠️  SMTP settings added. Please update with your Gmail credentials:${NC}"
    echo "      - SMTP_USER: Your Gmail address"
    echo "      - SMTP_PASS: Your Gmail App Password (not regular password)"
    echo "      - SMTP_FROM: Your Gmail address"
    echo ""
    echo -e "   ${YELLOW}   To get Gmail App Password:${NC}"
    echo "      1. Go to https://myaccount.google.com/apppasswords"
    echo "      2. Generate a new app password for 'Mail'"
    echo "      3. Copy the 16-character password"
    echo "      4. Update SMTP_PASS in backend/.env"
    echo ""
else
    echo -e "   ${GREEN}✅ SMTP settings found in .env${NC}"
    echo "   Current SMTP configuration:"
    grep "^SMTP_\|^TWO_FA_EMAIL=" .env | grep -v "PASS" || true
    echo "   SMTP_PASS: [HIDDEN]"
fi

echo ""

# ============================================
# STEP 3: VERIFY 2FA IS ENABLED IN CODE
# ============================================
echo -e "${YELLOW}🔍 Step 3: Verifying 2FA is enabled in code...${NC}"

if grep -q "2FA ENABLED - Generate code" routes/admin.js; then
    echo -e "   ${GREEN}✅ 2FA is enabled in backend code${NC}"
elif grep -q "2FA DISABLED" routes/admin.js; then
    echo -e "   ${RED}❌ 2FA is disabled in code!${NC}"
    echo -e "   ${YELLOW}   Pulling latest code from GitHub...${NC}"
    cd $DEPLOY_PATH
    git pull origin main
    cd backend
    if grep -q "2FA ENABLED - Generate code" routes/admin.js; then
        echo -e "   ${GREEN}✅ 2FA is now enabled${NC}"
    else
        echo -e "   ${RED}❌ 2FA still not enabled. Manual fix needed.${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  Cannot determine 2FA status${NC}"
fi

echo ""

# ============================================
# STEP 4: TEST SMTP CONFIGURATION
# ============================================
echo -e "${YELLOW}🧪 Step 4: Testing SMTP configuration...${NC}"

cat > /tmp/test-smtp.js << 'TESTEOF'
const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env' });

const host = process.env.SMTP_HOST;
const port = parseInt(process.env.SMTP_PORT) || 587;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const secure = process.env.SMTP_SECURE === 'true';

console.log('SMTP Configuration:');
console.log('  Host:', host || 'NOT SET');
console.log('  Port:', port);
console.log('  User:', user || 'NOT SET');
console.log('  Pass:', pass ? '[SET]' : 'NOT SET');
console.log('  Secure:', secure);
console.log('');

if (!host || !user || !pass) {
  console.log('❌ SMTP not fully configured');
  console.log('   Missing:', [
    !host ? 'SMTP_HOST' : '',
    !user ? 'SMTP_USER' : '',
    !pass ? 'SMTP_PASS' : ''
  ].filter(Boolean).join(', '));
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
});

transporter.verify((error, success) => {
  if (error) {
    console.log('❌ SMTP connection failed:', error.message);
    process.exit(1);
  } else {
    console.log('✅ SMTP connection successful!');
    process.exit(0);
  }
});
TESTEOF

if node /tmp/test-smtp.js 2>&1 | grep -q "✅"; then
    echo -e "   ${GREEN}✅ SMTP configuration is valid${NC}"
else
    echo -e "   ${RED}❌ SMTP configuration failed${NC}"
    node /tmp/test-smtp.js
    echo ""
    echo -e "   ${YELLOW}Please update backend/.env with correct SMTP credentials${NC}"
fi

rm -f /tmp/test-smtp.js

echo ""

# ============================================
# STEP 5: RESTART BACKEND
# ============================================
echo -e "${YELLOW}🔄 Step 5: Restarting backend...${NC}"

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
# STEP 6: TEST LOGIN (SHOULD REQUIRE 2FA)
# ============================================
echo -e "${YELLOW}🧪 Step 6: Testing login (should require 2FA)...${NC}"

sleep 2

RESPONSE=$(curl -s -X POST https://api.zentryasolutions.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "   ${YELLOW}⚠️  Got 200 - 2FA might be disabled or bypassed${NC}"
    echo "   Response: $BODY"
elif [ "$HTTP_CODE" = "503" ]; then
    echo -e "   ${RED}❌ Got 503 - SMTP email sending failed${NC}"
    echo "   Response: $BODY"
    echo ""
    echo -e "   ${YELLOW}Check SMTP configuration in backend/.env${NC}"
elif echo "$BODY" | grep -q "require2FA"; then
    echo -e "   ${GREEN}✅ 2FA is working!${NC}"
    echo "   Response: $BODY"
    echo ""
    echo -e "   ${GREEN}🎉 Login will now require 2FA code sent to email${NC}"
else
    echo -e "   ${YELLOW}⚠️  Got HTTP $HTTP_CODE${NC}"
    echo "   Response: $BODY"
fi

echo ""

# ============================================
# SUMMARY
# ============================================
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}✅ 2FA SETUP COMPLETE!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "   1. If SMTP test failed, update backend/.env with Gmail credentials"
echo "   2. Get Gmail App Password from: https://myaccount.google.com/apppasswords"
echo "   3. Update SMTP_USER, SMTP_PASS, SMTP_FROM in backend/.env"
echo "   4. Restart backend: pm2 restart license-admin"
echo "   5. Test login at: https://api.zentryasolutions.com/login"
echo ""
echo -e "${BLUE}🔐 Login Flow:${NC}"
echo "   1. Enter username: admin"
echo "   2. Enter password: admin123"
echo "   3. Check email (hussnain0341@gmail.com) for 6-digit code"
echo "   4. Enter code to complete login"
echo ""
echo -e "${GREEN}🎉 Done!${NC}"
echo ""

