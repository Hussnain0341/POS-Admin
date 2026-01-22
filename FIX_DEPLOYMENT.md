# 🔧 Fix Deployment - SSL Certificate Issue

The deployment script failed because it tried to configure Nginx with SSL certificates before they were obtained.

## Quick Fix

Run these commands on your VPS:

### Option 1: Run the Fix Script

```bash
cd /var/www/license-admin
chmod +x FIX_NGINX_SSL.sh
./FIX_NGINX_SSL.sh
```

### Option 2: Manual Fix

**Step 1: Fix Nginx Configuration (HTTP only)**

```bash
cat > /etc/nginx/sites-available/license.zentryasolutions.com << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name license.zentryasolutions.com;

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

nginx -t
systemctl reload nginx
```

**Step 2: Get SSL Certificate**

```bash
certbot --nginx -d license.zentryasolutions.com --non-interactive --agree-tos --email admin@zentryasolutions.com --redirect
```

**Step 3: Verify**

```bash
nginx -t
systemctl reload nginx
```

## Verify Everything is Working

1. **Check PM2 Status:**
   ```bash
   pm2 status
   pm2 logs license-admin
   ```

2. **Check Nginx:**
   ```bash
   systemctl status nginx
   ```

3. **Test the Application:**
   - Visit: http://license.zentryasolutions.com (should redirect to HTTPS)
   - Or: https://license.zentryasolutions.com

4. **Login:**
   - Username: `admin`
   - Password: `admin123`
   - ⚠️ Change password immediately!

## If SSL Still Fails

1. **Check if domain DNS is pointing to this server:**
   ```bash
   nslookup license.zentryasolutions.com
   ```

2. **Try Certbot with standalone mode:**
   ```bash
   certbot certonly --standalone -d license.zentryasolutions.com
   ```

3. **Then configure Nginx manually with the certificate paths**

## Updated Deployment Script

I've updated the `deploy-on-vps.sh` script to fix this issue. The new version:
1. Configures Nginx for HTTP first
2. Then runs Certbot to get SSL certificates
3. Certbot automatically updates Nginx config for HTTPS

You can re-run the deployment script, or just run the fix script above.

