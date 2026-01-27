# 🔧 Complete Fix for 413 Error

## ⚠️ Important: This is NOT a Database Error

The **413 Request Entity Too Large** error occurs at the **HTTP/proxy level** (Nginx), **BEFORE** the request reaches your backend or database. The database is never involved in this error.

---

## 🚀 Quick Fix (Run on VPS)

### **Step 1: Run Diagnostic Script**

```bash
# Copy the script to your VPS and run it
chmod +x verify-nginx-config.sh
sudo ./verify-nginx-config.sh
```

This will show you exactly what's wrong.

---

### **Step 2: Fix Based on Diagnostic Results**

#### **If `client_max_body_size` is Missing:**

```bash
# Edit config
sudo nano /etc/nginx/sites-available/api.zentryasolutions.com

# Add these lines INSIDE the server block (after server_name):
client_max_body_size 500M;
client_body_timeout 300s;
client_header_timeout 300s;
```

#### **If Config is Not Enabled:**

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/api.zentryasolutions.com /etc/nginx/sites-enabled/api.zentryasolutions.com

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
```

#### **If Global Limit Exists:**

```bash
# Edit main nginx config
sudo nano /etc/nginx/nginx.conf

# Find the http { block and add:
client_max_body_size 500M;

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
```

---

## 📋 Complete Updated Nginx Config

**File:** `/etc/nginx/sites-available/api.zentryasolutions.com`

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api.zentryasolutions.com;

    # CRITICAL: Large file upload support
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

## ✅ Verification Commands

```bash
# 1. Check if setting exists in config file
sudo grep "client_max_body_size" /etc/nginx/sites-available/api.zentryasolutions.com

# 2. Check what nginx is ACTUALLY using (most important!)
sudo nginx -T | grep -A 10 "api.zentryasolutions.com" | grep "client_max_body_size"

# 3. Test nginx config
sudo nginx -t

# 4. Reload nginx
sudo systemctl reload nginx

# 5. Check nginx error logs
sudo tail -f /var/log/nginx/error.log
```

---

## 🔍 Common Issues & Solutions

### **Issue 1: Config Not Saved**
**Symptom:** Changes don't appear when you check the file  
**Fix:** Make sure you saved the file (Ctrl+O, Enter, Ctrl+X in nano)

### **Issue 2: Config Not Enabled**
**Symptom:** Config file exists but nginx doesn't use it  
**Fix:** Create symlink: `sudo ln -s /etc/nginx/sites-available/api.zentryasolutions.com /etc/nginx/sites-enabled/`

### **Issue 3: Nginx Not Reloaded**
**Symptom:** Config is correct but still getting 413  
**Fix:** Force reload: `sudo systemctl restart nginx`

### **Issue 4: Global Limit Overriding**
**Symptom:** Server block has 500M but still getting 413  
**Fix:** Add `client_max_body_size 500M;` to `http` block in `/etc/nginx/nginx.conf`

### **Issue 5: Wrong Port**
**Symptom:** Backend not running on port 3001  
**Fix:** Check `pm2 list` and update `proxy_pass` if needed

---

## 🎯 One-Line Complete Fix

```bash
# Backup, update, test, and reload
sudo cp /etc/nginx/sites-available/api.zentryasolutions.com /etc/nginx/sites-available/api.zentryasolutions.com.backup && \
sudo sed -i '/server_name api.zentryasolutions.com;/a\    client_max_body_size 500M;\n    client_body_timeout 300s;\n    client_header_timeout 300s;' /etc/nginx/sites-available/api.zentryasolutions.com && \
sudo nginx -t && \
sudo systemctl reload nginx && \
echo "✅ Nginx updated successfully!"
```

---

## 📊 Backend Status (Already Fixed)

✅ **Backend is already configured correctly:**
- Multer: 500MB limit
- Express body parser: 500MB limit

**The issue is 100% in Nginx configuration on your VPS.**

---

## 🔄 After Fixing

1. **Test the upload again** - 413 error should be gone
2. **Check browser console** - Should see upload progress
3. **Check backend logs** - Should see file being received: `pm2 logs license-admin`

---

**Run the diagnostic script first to see exactly what needs to be fixed!**

