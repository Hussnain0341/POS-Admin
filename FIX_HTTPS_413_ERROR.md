# 🔧 Fix 413 Error on HTTPS (Port 443)

## ❌ Problem Identified

You have **TWO server blocks** for `api.zentryasolutions.com`:
1. **Port 80 (HTTP)** - Has `client_max_body_size 500M` ✅
2. **Port 443 (HTTPS)** - Missing `client_max_body_size` ❌

Since you're accessing via **HTTPS** (`https://api.zentryasolutions.com`), the HTTPS server block is being used, which doesn't have the upload size limit configured.

---

## ✅ Solution: Update HTTPS Server Block

The HTTPS server block is in `/etc/nginx/sites-available/slack-api`. You need to add `client_max_body_size` to it.

---

## 🚀 Fix Commands (Run on VPS)

### **Step 1: Edit the HTTPS Config**

```bash
sudo nano /etc/nginx/sites-available/slack-api
```

### **Step 2: Find the HTTPS Server Block**

Look for the server block that has:
- `listen 443 ssl;`
- `server_name api.zentryasolutions.com;`

### **Step 3: Add These Lines**

Add these lines **INSIDE** the HTTPS server block (after `server_name`):

```nginx
# Large file upload support (500MB for EXE files)
client_max_body_size 500M;
client_body_timeout 300s;
client_header_timeout 300s;
client_body_buffer_size 128k;
```

### **Step 4: Also Update the location / Block**

Make sure the `location /` block has proper timeouts:

```nginx
location / {
    proxy_pass http://localhost:3001;  # Make sure this is 3001, not 3000!
    # ... existing proxy settings ...
    
    # Timeouts for large uploads
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
}
```

### **Step 5: Test and Reload**

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📋 Complete HTTPS Server Block Example

```nginx
server {
    listen 443 ssl; # managed by Certbot
    server_name api.zentryasolutions.com;

    # Large file upload support (500MB for EXE files)
    client_max_body_size 500M;
    client_body_timeout 300s;
    client_header_timeout 300s;
    client_body_buffer_size 128k;

    ssl_certificate /etc/letsencrypt/live/api.zentryasolutions.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/api.zentryasolutions.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for large file uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

---

## 🔍 Verify After Fix

```bash
# Check if HTTPS server block now has the setting
sudo nginx -T | grep -A 30 "listen 443" | grep -A 30 "api.zentryasolutions.com" | grep "client_max_body_size"
```

This should show: `client_max_body_size 500M;`

---

## ⚠️ Important Notes

1. **HTTPS is the active config** - You're using `https://api.zentryasolutions.com`, so the port 443 server block is what matters
2. **Check proxy_pass port** - Make sure it's `3001`, not `3000` (line 140 in your output shows 3000)
3. **Both configs need updating** - Update the HTTPS server block in `slack-api` config file

---

## 🎯 Quick One-Line Check

```bash
# See which server block handles HTTPS
sudo nginx -T | grep -B 5 -A 25 "listen 443" | grep -A 25 "api.zentryasolutions.com"
```

This will show you the exact HTTPS server block that needs updating.

