# 🚀 Quick Fix Commands for VPS

## Fix API URL Issue

Run these commands on your VPS:

```bash
# Download the fix script (CORRECT URL)
curl -o fix-api-url.sh https://raw.githubusercontent.com/Hussnain0341/POS-Admin/main/fix-api-url.sh

# Make it executable
chmod +x fix-api-url.sh

# Run it
bash fix-api-url.sh
```

## Alternative: Manual Fix (If Script Doesn't Work)

```bash
# 1. Go to project directory
cd /var/www/license-admin

# 2. Pull latest code
git pull origin main

# 3. Update frontend API URL
sed -i 's|https://license.zentryasolutions.com/api|https://api.zentryasolutions.com/api|g' frontend/src/services/api.ts

# 4. Rebuild frontend
cd frontend
npm run build
cd ..

# 5. Restart backend
pm2 restart license-admin
```

## Verify It's Fixed

```bash
# Check if API URL is updated
grep "api.zentryasolutions.com" frontend/src/services/api.ts

# Check backend CORS
grep -A 5 "corsOptions" backend/index.js

# Check PM2 status
pm2 status

# Check logs
pm2 logs license-admin --lines 20
```

