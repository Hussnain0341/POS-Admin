#!/bin/bash
# Quick verification that login works

echo "Testing login endpoint..."
echo ""

RESPONSE=$(curl -s -X POST https://api.zentryasolutions.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "200" ]; then
    echo ""
    echo "✅ LOGIN WORKS! You can now log in at:"
    echo "   https://api.zentryasolutions.com/login"
    echo ""
    echo "Username: admin"
    echo "Password: admin123"
else
    echo ""
    echo "❌ Still getting error. Check backend logs:"
    echo "   pm2 logs license-admin --lines 20"
fi

