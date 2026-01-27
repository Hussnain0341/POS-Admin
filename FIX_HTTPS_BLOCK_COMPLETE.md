# 🔧 Complete Fix for HTTPS 413 Error

## 🔍 Current Status

The grep command shows that `client_max_body_size` is **NOT** in the HTTPS server block. You need to add it.

---

## 📋 Step-by-Step Fix

### **Step 1: View the Complete HTTPS Server Block**

```bash
# See the full HTTPS server block structure
sudo nginx -T 2>/dev/null | grep -B 2 -A 40 "listen 443" | grep -A 40 "api.zentryasolutions.com"
```

This will show you the complete structure so you know where to add the setting.

---

### **Step 2: Edit the Config File**

```bash
sudo nano /etc/nginx/sites-available/slack-api
```

---

### **Step 3: Find the HTTPS Server Block**

Look for a block that starts with:
```nginx
server {
    listen 443 ssl;
    server_name api.zentryasolutions.com;
```

---

### **Step 4: Add the Settings**

Add these lines **RIGHT AFTER** `server_name api.zentryasolutions.com;` (before the SSL certificates):

```nginx
server {
    listen 443 ssl;
    server_name api.zentryasolutions.com;

    # Large file upload support (500MB for EXE files)
    client_max_body_size 500M;
    client_body_timeout 300s;
    client_header_timeout 300s;
    client_body_buffer_size 128k;

    ssl_certificate /etc/letsencrypt/live/api.zentryasolutions.com/fullchain.pem;
    # ... rest of config ...
```

---

### **Step 5: Also Update the location / Block**

Make sure the `location /` block has proper timeouts. Find it and add/update:

```nginx
location / {
    proxy_pass http://localhost:3001;  # Make sure it's 3001!
    
    # ... existing proxy headers ...
    
    # Timeouts for large file uploads
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
}
```

---

### **Step 6: Save and Exit**

- Press `Ctrl+O` to save
- Press `Enter` to confirm
- Press `Ctrl+X` to exit

---

### **Step 7: Test and Reload**

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

### **Step 8: Verify It Worked**

```bash
# This should now show: client_max_body_size 500M;
sudo nginx -T 2>/dev/null | grep -A 40 "listen 443" | grep -A 40 "api.zentryasolutions.com" | grep "client_max_body_size"
```

---

## 📋 Complete HTTPS Server Block Template

Here's what the complete HTTPS server block should look like:

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

## ⚠️ Important Notes

1. **The setting must be INSIDE the server block** - Not outside, not in a comment
2. **Place it AFTER server_name** - Before the SSL certificates
3. **Check proxy_pass port** - Should be `3001`, not `3000`
4. **Save the file** - Make sure you saved with Ctrl+O before exiting

---

## 🔍 Quick Verification Commands

```bash
# 1. View full HTTPS block
sudo nginx -T 2>/dev/null | grep -B 2 -A 40 "listen 443" | grep -A 40 "api.zentryasolutions.com"

# 2. Check if setting exists
sudo nginx -T 2>/dev/null | grep -A 40 "listen 443" | grep -A 40 "api.zentryasolutions.com" | grep "client_max_body_size"

# 3. Check the actual config file
sudo grep -A 5 "listen 443" /etc/nginx/sites-available/slack-api | head -20
```

---

## 🎯 If Still Not Working

If after adding the setting it still doesn't show up:

1. **Check file was saved**: `sudo cat /etc/nginx/sites-available/slack-api | grep -A 5 "listen 443"`
2. **Check if config is enabled**: `ls -la /etc/nginx/sites-enabled/ | grep slack-api`
3. **Force restart nginx**: `sudo systemctl restart nginx` (instead of reload)

---

**The key is adding `client_max_body_size 500M;` INSIDE the HTTPS server block in `/etc/nginx/sites-available/slack-api`**


