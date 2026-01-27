# 🔧 Fix 413 Request Entity Too Large Error

## ❌ Problem
Nginx (reverse proxy) has a default `client_max_body_size` of **1MB**, which blocks large EXE file uploads.

---

## ✅ Solution: Update Nginx Configuration

### **Step 1: Find Your Nginx Config File**

```bash
# Find nginx config location
nginx -t

# Common locations:
# /etc/nginx/nginx.conf
# /etc/nginx/sites-available/default
# /etc/nginx/sites-available/api.zentryasolutions.com
# /etc/nginx/conf.d/default.conf
```

---

### **Step 2: Edit Nginx Configuration**

```bash
# Edit the config file (replace with your actual file)
sudo nano /etc/nginx/sites-available/api.zentryasolutions.com
```

**Add or update these settings inside the `server` block:**

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api.zentryasolutions.com;

    # Increase upload size limit (500MB for EXE files)
    client_max_body_size 500M;
    
    # Increase timeouts for large file uploads
    client_body_timeout 300s;
    client_header_timeout 300s;
    
    # Buffer settings
    client_body_buffer_size 128k;

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
        
        # Increase proxy timeouts for large uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

---

### **Step 3: Test and Reload Nginx**

```bash
# Test configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx

# Or restart nginx
sudo systemctl restart nginx
```

---

## 🔍 Alternative: Update Main Nginx Config

If you want to set this globally (affects all sites):

```bash
sudo nano /etc/nginx/nginx.conf
```

**Add inside the `http` block:**

```nginx
http {
    # ... other settings ...
    
    # Increase upload size limit globally
    client_max_body_size 500M;
    client_body_timeout 300s;
    client_header_timeout 300s;
    client_body_buffer_size 128k;
    
    # ... rest of config ...
}
```

Then test and reload:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## ✅ Verify Changes

After updating, test the upload again. The 413 error should be resolved.

---

## 📋 Complete Nginx Config Example

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api.zentryasolutions.com;

    # Large file upload support
    client_max_body_size 500M;
    client_body_timeout 300s;
    client_header_timeout 300s;
    client_body_buffer_size 128k;

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
        
        # Timeouts for large uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

---

## 🚨 Important Notes

1. **500MB limit** should be enough for most EXE installers
2. **Increase if needed** - Some installers can be 1GB+, adjust accordingly
3. **Restart required** - Nginx must be reloaded for changes to take effect
4. **Backend already configured** - Multer is set to 500MB, Express body parser updated to 500MB

---

## 🔄 After Making Changes

```bash
# 1. Test config
sudo nginx -t

# 2. Reload nginx
sudo systemctl reload nginx

# 3. Restart backend (if needed)
pm2 restart license-admin

# 4. Test upload again
```

---

**The backend code has been updated to support 500MB uploads. You just need to update Nginx configuration on your VPS.**

