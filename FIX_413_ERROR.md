# 🔧 Fix 413 Request Entity Too Large Error

## ❌ Error
```
POST https://api.zentryasolutions.com/api/pos-updates/upload 413 (Request Entity Too Large)
```

## ✅ Root Cause
Nginx (reverse proxy) has a default `client_max_body_size` of **1MB**, which blocks large EXE file uploads.

---

## 🚀 Quick Fix (Run on VPS)

### **1. Find Nginx Config File**
```bash
nginx -t
# Look for: "configuration file /etc/nginx/..."
```

### **2. Edit Config File**
```bash
sudo nano /etc/nginx/sites-available/api.zentryasolutions.com
```

### **3. Add This Inside `server` Block**
```nginx
client_max_body_size 500M;
client_body_timeout 300s;
proxy_read_timeout 300s;
proxy_send_timeout 300s;
```

### **4. Test & Reload**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📋 Complete Nginx Config Update

**Add these lines inside your `server` block:**

```nginx
server {
    # ... existing config ...
    
    # Large file upload support
    client_max_body_size 500M;
    client_body_timeout 300s;
    client_header_timeout 300s;
    
    location / {
        proxy_pass http://localhost:3001;
        # ... existing proxy settings ...
        
        # Timeouts for large uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

---

## ✅ Backend Already Updated

- ✅ Multer: 500MB limit (already configured)
- ✅ Express body parser: Updated to 500MB

**You only need to update Nginx on your VPS!**

---

## 🔍 Find Your Nginx Config

```bash
# List all nginx config files
ls -la /etc/nginx/sites-available/

# Or check main config
cat /etc/nginx/nginx.conf | grep -i "server_name"
```

---

## 🎯 One-Line Command to Find Config

```bash
grep -r "api.zentryasolutions.com" /etc/nginx/
```

This will show you which file contains your server configuration.


