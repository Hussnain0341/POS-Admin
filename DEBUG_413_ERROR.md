# 🔍 Debug 413 Request Entity Too Large Error

## ❌ Still Getting 413 Error?

The 413 error is **NOT a database error** - it's an HTTP-level error that occurs **before** the request reaches your backend or database. It's being blocked by Nginx or another proxy.

---

## 🔍 Step-by-Step Debugging

### **Step 1: Verify Nginx Config Was Applied**

```bash
# Check if your config file has the changes
sudo grep -n "client_max_body_size" /etc/nginx/sites-available/api.zentryasolutions.com

# Should show: client_max_body_size 500M;
```

**If it's NOT there, the config wasn't saved properly!**

---

### **Step 2: Check for Multiple Nginx Configs**

```bash
# Find ALL nginx configs that might affect your site
sudo grep -r "api.zentryasolutions.com" /etc/nginx/

# Check if there's a sites-enabled symlink
ls -la /etc/nginx/sites-enabled/

# Check main nginx.conf for global limits
sudo grep -i "client_max_body_size" /etc/nginx/nginx.conf
```

---

### **Step 3: Verify Nginx is Using Your Config**

```bash
# Check which config file nginx is actually using
sudo nginx -T | grep -A 20 "api.zentryasolutions.com"

# This shows the ACTIVE configuration nginx is using
```

---

### **Step 4: Check Nginx Error Logs**

```bash
# Check nginx error logs for 413 errors
sudo tail -f /var/log/nginx/error.log

# Or check access logs
sudo tail -f /var/log/nginx/access.log | grep 413
```

---

### **Step 5: Ensure Config is Enabled**

```bash
# Make sure your site config is enabled
sudo ls -la /etc/nginx/sites-enabled/ | grep api.zentryasolutions.com

# If not enabled, create symlink
sudo ln -s /etc/nginx/sites-available/api.zentryasolutions.com /etc/nginx/sites-enabled/api.zentryasolutions.com
```

---

### **Step 6: Check Global Nginx Limits**

```bash
# Check main nginx.conf for global client_max_body_size
sudo cat /etc/nginx/nginx.conf | grep -i "client_max_body_size"

# If there's a global limit (e.g., 1m), it might override your server block
# You need to set it in the http block OR ensure server block takes precedence
```

---

## ✅ Complete Fix Checklist

### **1. Update Nginx Config File**

```bash
sudo nano /etc/nginx/sites-available/api.zentryasolutions.com
```

**Make sure it has:**
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api.zentryasolutions.com;

    # CRITICAL: This must be present
    client_max_body_size 500M;
    client_body_timeout 300s;
    client_header_timeout 300s;

    location / {
        proxy_pass http://localhost:3001;
        # ... rest of config ...
        
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

---

### **2. Check Global Nginx Config**

```bash
sudo nano /etc/nginx/nginx.conf
```

**In the `http` block, add or update:**
```nginx
http {
    # ... other settings ...
    
    # Global limit (can be overridden by server blocks)
    client_max_body_size 500M;
    
    # ... rest of config ...
}
```

---

### **3. Ensure Config is Enabled**

```bash
# Check if symlink exists
ls -la /etc/nginx/sites-enabled/ | grep api

# If not, create it
sudo ln -s /etc/nginx/sites-available/api.zentryasolutions.com /etc/nginx/sites-enabled/api.zentryasolutions.com
```

---

### **4. Test and Reload**

```bash
# Test configuration
sudo nginx -t

# If test passes, RELOAD (not restart)
sudo systemctl reload nginx

# Or force restart if reload doesn't work
sudo systemctl restart nginx

# Verify nginx is running
sudo systemctl status nginx
```

---

### **5. Verify Active Configuration**

```bash
# This shows what nginx is ACTUALLY using
sudo nginx -T | grep -A 30 "server_name api.zentryasolutions.com"
```

**Look for `client_max_body_size 500M` in the output!**

---

## 🚨 Common Issues

### **Issue 1: Config Not Enabled**
```bash
# Fix: Create symlink
sudo ln -s /etc/nginx/sites-available/api.zentryasolutions.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### **Issue 2: Global Limit Overriding**
```bash
# Fix: Add to http block in nginx.conf
sudo nano /etc/nginx/nginx.conf
# Add: client_max_body_size 500M; in http block
sudo nginx -t && sudo systemctl reload nginx
```

### **Issue 3: Nginx Not Reloaded**
```bash
# Fix: Force reload
sudo systemctl restart nginx
```

### **Issue 4: Wrong Port**
```bash
# Verify backend is running on port 3001
pm2 list
netstat -tlnp | grep 3001
```

---

## 🔍 Quick Diagnostic Commands

```bash
# 1. Check if config has the setting
sudo grep "client_max_body_size" /etc/nginx/sites-available/api.zentryasolutions.com

# 2. Check active nginx config
sudo nginx -T | grep -A 5 "api.zentryasolutions.com" | grep "client_max_body_size"

# 3. Check nginx error logs
sudo tail -20 /var/log/nginx/error.log

# 4. Test nginx config
sudo nginx -t

# 5. Check nginx status
sudo systemctl status nginx
```

---

## 📋 Complete Verification Script

Run this on your VPS to check everything:

```bash
#!/bin/bash
echo "=== Checking Nginx Configuration ==="
echo ""
echo "1. Config file exists:"
ls -la /etc/nginx/sites-available/api.zentryasolutions.com
echo ""
echo "2. Config is enabled:"
ls -la /etc/nginx/sites-enabled/ | grep api
echo ""
echo "3. client_max_body_size in config:"
sudo grep "client_max_body_size" /etc/nginx/sites-available/api.zentryasolutions.com
echo ""
echo "4. Active nginx config (what nginx is actually using):"
sudo nginx -T 2>/dev/null | grep -A 10 "api.zentryasolutions.com" | grep -E "client_max_body_size|proxy_pass"
echo ""
echo "5. Nginx test:"
sudo nginx -t
echo ""
echo "6. Nginx status:"
sudo systemctl status nginx --no-pager | head -5
```

---

## ✅ Final Solution: Force Update All Configs

If nothing works, update BOTH files:

**1. Server-specific config:**
```bash
sudo nano /etc/nginx/sites-available/api.zentryasolutions.com
# Add: client_max_body_size 500M; inside server block
```

**2. Global config:**
```bash
sudo nano /etc/nginx/nginx.conf
# Add: client_max_body_size 500M; inside http block
```

**3. Test and reload:**
```bash
sudo nginx -t && sudo systemctl restart nginx
```

---

**The 413 error is 100% an Nginx/proxy issue, NOT a database issue. Follow the steps above to fix it.**

