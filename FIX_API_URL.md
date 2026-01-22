# 🔧 Fix API URL and CORS Issues

## Problem

Your frontend is working at `https://api.zentryasolutions.com/login` but it's trying to call the backend at `https://license.zentryasolutions.com/api/admin/login`, which causes:
- ❌ SSL Protocol Error
- ❌ CORS Policy Error
- ❌ Network Error

## Solution

Run this fix script on your VPS to update everything automatically:

### Quick Fix (One Command)

```bash
# Download and run the fix script
curl -o fix-api-url.sh https://raw.githubusercontent.com/Hussnain0341/POS-Admin/main/fix-api-url.sh
chmod +x fix-api-url.sh
bash fix-api-url.sh
```

## What the Script Does

1. ✅ Updates frontend API URL to `https://api.zentryasolutions.com/api`
2. ✅ Updates backend CORS to allow `api.zentryasolutions.com`
3. ✅ Rebuilds frontend with new API URL
4. ✅ Configures Nginx for `api.zentryasolutions.com`
5. ✅ Sets up SSL certificate
6. ✅ Restarts backend

## Manual Fix (If Script Doesn't Work)

### Step 1: Update Frontend API URL

```bash
cd /var/www/license-admin
sed -i 's|https://license.zentryasolutions.com/api|https://api.zentryasolutions.com/api|g' frontend/src/services/api.ts
```

### Step 2: Rebuild Frontend

```bash
cd /var/www/license-admin/frontend
npm run build
```

### Step 3: Update Backend CORS

```bash
cd /var/www/license-admin
# Edit backend/index.js and add 'https://api.zentryasolutions.com' to CORS origins
nano backend/index.js
```

Find this section:
```javascript
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://api.zentryasolutions.com',
        'https://www.api.zentryasolutions.com',
        'https://license.zentryasolutions.com',
        'https://www.license.zentryasolutions.com'
      ]
    : '*',
  credentials: true,
  optionsSuccessStatus: 200
};
```

### Step 4: Restart Backend

```bash
pm2 restart license-admin
```

### Step 5: Update Nginx (if needed)

```bash
# Create/update Nginx config for api.zentryasolutions.com
cat > /etc/nginx/sites-available/api.zentryasolutions.com << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name api.zentryasolutions.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/api.zentryasolutions.com /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Step 6: Setup SSL

```bash
certbot --nginx -d api.zentryasolutions.com --non-interactive --agree-tos --email admin@zentryasolutions.com --redirect
```

## Verify Fix

After running the fix:

1. **Open your browser console** (F12)
2. **Go to**: `https://api.zentryasolutions.com/login`
3. **Try to login** with `admin` / `admin123`
4. **Check console** - you should see API calls to `https://api.zentryasolutions.com/api/admin/login`

## Expected Result

✅ No SSL errors  
✅ No CORS errors  
✅ Login works properly  
✅ API calls go to `api.zentryasolutions.com/api`

## Troubleshooting

### Still Getting CORS Error?

```bash
# Check backend CORS configuration
cat /var/www/license-admin/backend/index.js | grep -A 10 "corsOptions"

# Restart backend
pm2 restart license-admin

# Check backend logs
pm2 logs license-admin
```

### Still Getting SSL Error?

```bash
# Check SSL certificate
certbot certificates

# Renew certificate
certbot renew

# Check Nginx SSL config
cat /etc/nginx/sites-available/api.zentryasolutions.com
```

### Frontend Still Using Old URL?

```bash
# Clear browser cache (Ctrl+Shift+Delete)
# Or hard refresh (Ctrl+F5)

# Verify frontend build
cat /var/www/license-admin/frontend/build/static/js/*.js | grep -o "license.zentryasolutions.com" | head -1
# Should return nothing if fixed
```

## After Fix

Your application should work at:
- **Frontend**: `https://api.zentryasolutions.com`
- **Backend API**: `https://api.zentryasolutions.com/api`

---

**Need Help?** Check PM2 logs: `pm2 logs license-admin`

