# 🔍 Find Missing Uploaded File

## ❌ Problem

File doesn't exist at expected path: `/var/www/updates/hisaabkitab/windows/1.0.0/nvm-setup.exe`

---

## 🔍 Diagnostic Commands (Run on VPS)

### **Step 1: Check if Upload Directory Exists**

```bash
# Check base directory
ls -la /var/www/updates/hisaabkitab/

# Check windows directory
ls -la /var/www/updates/hisaabkitab/windows/

# Check if any files exist
find /var/www/updates -type f -name "*.exe" 2>/dev/null
```

---

### **Step 2: Check Database for Actual File Path**

```bash
# Check what path is stored in database
sudo -u postgres psql -d hisaabkitab_license -c "SELECT version, filepath, filename, download_url FROM pos_versions WHERE version = '1.0.0';"
```

This will show you:
- `filepath` - Where the file was actually saved
- `filename` - The actual filename
- `download_url` - The URL that was generated

---

### **Step 3: Search for the File**

```bash
# Search entire /var/www for the file
find /var/www -name "nvm-setup.exe" 2>/dev/null

# Search entire system (if needed)
find / -name "nvm-setup.exe" 2>/dev/null | head -10
```

---

### **Step 4: Check Backend Upload Directory**

The backend might be using a different path. Check:

```bash
# Check if backend created uploads directory
ls -la /var/www/license-admin/backend/uploads/ 2>/dev/null
ls -la /var/www/license-admin/uploads/ 2>/dev/null

# Check environment variable
cd /var/www/license-admin/backend
cat .env | grep UPDATES_BASE_DIR
```

---

### **Step 5: Check Backend Logs**

```bash
# Check upload logs
pm2 logs license-admin --lines 100 | grep -i "upload\|file\|error"

# Or check access logs
tail -50 /var/www/license-admin/backend/logs/access.log | grep upload
```

---

## ✅ Most Likely Issues

### **Issue 1: File Uploaded to Wrong Location**

**Check database:**
```bash
sudo -u postgres psql -d hisaabkitab_license -c "SELECT filepath FROM pos_versions WHERE version = '1.0.0';"
```

**If filepath is different, either:**
- Move the file to the correct location
- Update the database record
- Fix the upload configuration

---

### **Issue 2: Upload Directory Doesn't Exist**

**Create it:**
```bash
sudo mkdir -p /var/www/updates/hisaabkitab/windows
sudo chown -R www-data:www-data /var/www/updates
sudo chmod -R 755 /var/www/updates
```

---

### **Issue 3: Backend Using Different Base Directory**

**Check environment variable:**
```bash
cd /var/www/license-admin/backend
cat .env | grep UPDATES_BASE_DIR
```

**If it's different, either:**
- Update `.env` to use `/var/www/updates/hisaabkitab`
- Or move files to the configured directory

---

## 🔧 Quick Fix Commands

```bash
# 1. Check database for actual file path
sudo -u postgres psql -d hisaabkitab_license -c "SELECT version, filepath, filename FROM pos_versions WHERE version = '1.0.0';"

# 2. Search for the file
find /var/www -name "nvm-setup.exe" 2>/dev/null

# 3. Check backend .env
cd /var/www/license-admin/backend && cat .env | grep UPDATES

# 4. Check if upload directory exists
ls -la /var/www/updates/hisaabkitab/windows/

# 5. Create directory if missing
sudo mkdir -p /var/www/updates/hisaabkitab/windows
sudo chown -R www-data:www-data /var/www/updates
```

---

## 📋 Expected vs Actual

**Expected:**
- Path: `/var/www/updates/hisaabkitab/windows/1.0.0/nvm-setup.exe`
- URL: `https://api.zentryasolutions.com/pos-updates/files/windows/1.0.0/nvm-setup.exe`

**Check database to see what was actually stored!**


