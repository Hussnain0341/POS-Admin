# 🔧 Fix EXE File Download Issue

## ❌ Problem

File upload works, but download from `https://api.zentryasolutions.com/pos-updates/files/windows/1.0.0/nvm-setup.exe` doesn't work.

---

## 🔍 Diagnostic Steps (Run on VPS)

### **Step 1: Check if File Exists**

```bash
# Check if the file exists at the expected path
ls -la /var/www/updates/hisaabkitab/windows/1.0.0/nvm-setup.exe

# Or check the entire directory structure
ls -la /var/www/updates/hisaabkitab/windows/1.0.0/
```

**Expected path:** `/var/www/updates/hisaabkitab/windows/1.0.0/nvm-setup.exe`

---

### **Step 2: Check File Permissions**

```bash
# Check permissions
ls -la /var/www/updates/hisaabkitab/windows/1.0.0/

# Files should be readable by nginx/www-data
# If not, fix permissions:
sudo chmod -R 755 /var/www/updates/hisaabkitab
sudo chown -R www-data:www-data /var/www/updates/hisaabkitab
```

---

### **Step 3: Check Backend Logs**

```bash
# Check if backend is receiving the request
pm2 logs license-admin --lines 50 | grep "pos-updates"

# Or check access logs
tail -f /var/www/license-admin/backend/logs/access.log | grep "pos-updates"
```

---

### **Step 4: Test Direct Access**

```bash
# Test if backend can serve the file directly (bypassing nginx)
curl -I http://localhost:3001/pos-updates/files/windows/1.0.0/nvm-setup.exe

# Should return 200 OK if file exists and backend can serve it
```

---

### **Step 5: Check Nginx Configuration**

The static files should be served by the backend (Express), not Nginx. But we need to make sure Nginx isn't blocking or interfering.

```bash
# Check if there's any nginx rule blocking /pos-updates/files
sudo nginx -T 2>/dev/null | grep -A 10 "pos-updates"
```

---

## ✅ Common Issues & Fixes

### **Issue 1: File Doesn't Exist**

**Symptom:** 404 error or file not found

**Fix:**
```bash
# Check where files are actually stored
find /var/www -name "nvm-setup.exe" 2>/dev/null

# Check database to see what path is stored
sudo -u postgres psql -d hisaabkitab_license -c "SELECT version, filepath, download_url FROM pos_versions WHERE version = '1.0.0';"
```

---

### **Issue 2: Wrong File Path**

**Symptom:** File exists but at different location

**Check:**
```bash
# See what path is stored in database
sudo -u postgres psql -d hisaabkitab_license -c "SELECT filepath FROM pos_versions WHERE version = '1.0.0';"

# Compare with expected path
# Expected: /var/www/updates/hisaabkitab/windows/1.0.0/nvm-setup.exe
```

---

### **Issue 3: Permission Issues**

**Symptom:** 403 Forbidden or file not accessible

**Fix:**
```bash
# Fix ownership and permissions
sudo chown -R www-data:www-data /var/www/updates/hisaabkitab
sudo chmod -R 755 /var/www/updates/hisaabkitab
sudo chmod -R 644 /var/www/updates/hisaabkitab/windows/*/*.exe
```

---

### **Issue 4: Backend Not Serving Static Files**

**Symptom:** Backend returns 404 even though file exists

**Check:**
```bash
# Verify backend is running
pm2 list

# Check backend logs for errors
pm2 logs license-admin --err --lines 100

# Test backend directly
curl -v http://localhost:3001/pos-updates/files/windows/1.0.0/nvm-setup.exe
```

---

### **Issue 5: Nginx Blocking or Redirecting**

**Symptom:** Request doesn't reach backend

**Fix:** Make sure Nginx is proxying `/pos-updates/files` to the backend, not trying to serve it directly.

Check your Nginx config - the `location /` block should proxy everything to the backend:

```nginx
location / {
    proxy_pass http://localhost:3001;
    # ... other proxy settings ...
}
```

---

## 🔧 Quick Fix Commands

```bash
# 1. Check if file exists
ls -la /var/www/updates/hisaabkitab/windows/1.0.0/nvm-setup.exe

# 2. Fix permissions if needed
sudo chown -R www-data:www-data /var/www/updates/hisaabkitab
sudo chmod -R 755 /var/www/updates/hisaabkitab

# 3. Test backend directly
curl -I http://localhost:3001/pos-updates/files/windows/1.0.0/nvm-setup.exe

# 4. Check backend logs
pm2 logs license-admin --lines 50

# 5. Restart backend if needed
pm2 restart license-admin
```

---

## 📋 Expected File Structure

```
/var/www/updates/hisaabkitab/
└── windows/
    └── 1.0.0/
        └── nvm-setup.exe
```

---

## 🎯 Complete Diagnostic Script

Run this on your VPS to diagnose the issue:

```bash
#!/bin/bash
echo "=== File Download Diagnostic ==="
echo ""

echo "1. Checking file existence..."
FILE_PATH="/var/www/updates/hisaabkitab/windows/1.0.0/nvm-setup.exe"
if [ -f "$FILE_PATH" ]; then
    echo "✅ File exists: $FILE_PATH"
    ls -lh "$FILE_PATH"
else
    echo "❌ File NOT found: $FILE_PATH"
    echo "Searching for file..."
    find /var/www -name "nvm-setup.exe" 2>/dev/null
fi
echo ""

echo "2. Checking directory structure..."
ls -la /var/www/updates/hisaabkitab/windows/ 2>/dev/null || echo "Directory doesn't exist"
echo ""

echo "3. Checking file permissions..."
if [ -f "$FILE_PATH" ]; then
    ls -la "$FILE_PATH"
    echo "Owner: $(stat -c '%U:%G' "$FILE_PATH")"
    echo "Permissions: $(stat -c '%a' "$FILE_PATH")"
fi
echo ""

echo "4. Testing backend direct access..."
curl -I http://localhost:3001/pos-updates/files/windows/1.0.0/nvm-setup.exe 2>&1 | head -5
echo ""

echo "5. Checking database record..."
sudo -u postgres psql -d hisaabkitab_license -c "SELECT version, filepath, download_url FROM pos_versions WHERE version = '1.0.0';" 2>/dev/null
echo ""

echo "6. Checking backend process..."
pm2 list | grep license-admin
echo ""
```

---

## 🔍 Check Browser Console/Network Tab

When you try to download, check:
1. **HTTP Status Code** - Is it 404, 403, 500, or something else?
2. **Response Headers** - What does the server return?
3. **Network Tab** - Does the request reach the server?

---

**Run the diagnostic steps above to identify the exact issue!**


