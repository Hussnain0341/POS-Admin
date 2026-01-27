# 🔧 Fix Current File Path Issue

## ❌ Problem

File is at: `/var/www/updates/hisaabkitab/windows/temp/nvm-setup.exe`  
URL expects: `/var/www/updates/hisaabkitab/windows/1.0.0/nvm-setup.exe`

---

## ✅ Quick Fix (Run on VPS)

### **Move File to Correct Location**

```bash
# 1. Create version directory
sudo mkdir -p /var/www/updates/hisaabkitab/windows/1.0.0

# 2. Move file from temp to version directory
sudo mv /var/www/updates/hisaabkitab/windows/temp/nvm-setup.exe /var/www/updates/hisaabkitab/windows/1.0.0/nvm-setup.exe

# 3. Fix permissions
sudo chown -R www-data:www-data /var/www/updates/hisaabkitab
sudo chmod -R 755 /var/www/updates/hisaabkitab

# 4. Update database to reflect correct path
sudo -u postgres psql -d hisaabkitab_license -c "UPDATE pos_versions SET filepath = '/var/www/updates/hisaabkitab/windows/1.0.0/nvm-setup.exe' WHERE version = '1.0.0';"

# 5. Test download
curl -I http://localhost:3001/pos-updates/files/windows/1.0.0/nvm-setup.exe
```

---

## 🚀 One-Line Fix

```bash
sudo mkdir -p /var/www/updates/hisaabkitab/windows/1.0.0 && sudo mv /var/www/updates/hisaabkitab/windows/temp/nvm-setup.exe /var/www/updates/hisaabkitab/windows/1.0.0/nvm-setup.exe && sudo chown -R www-data:www-data /var/www/updates/hisaabkitab && sudo -u postgres psql -d hisaabkitab_license -c "UPDATE pos_versions SET filepath = '/var/www/updates/hisaabkitab/windows/1.0.0/nvm-setup.exe' WHERE version = '1.0.0';"
```

---

## ✅ Code Fix Applied

I've also fixed the upload code so future uploads will automatically move files to the correct version directory. After you pull the latest code, new uploads will work correctly.

---

## 🔍 Verify After Fix

```bash
# Check file exists
ls -la /var/www/updates/hisaabkitab/windows/1.0.0/nvm-setup.exe

# Test backend
curl -I http://localhost:3001/pos-updates/files/windows/1.0.0/nvm-setup.exe

# Should return: HTTP/1.1 200 OK
```

---

**Run the fix commands above to move the file, then test the download URL again!**


