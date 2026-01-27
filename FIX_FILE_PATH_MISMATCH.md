# 🔧 Fix File Path Mismatch

## ❌ Problem Identified

**File is at:** `/var/www/updates/hisaabkitab/windows/temp/nvm-setup.exe`  
**URL expects:** `/var/www/updates/hisaabkitab/windows/1.0.0/nvm-setup.exe`

The file was uploaded to a `temp` directory instead of the version directory (`1.0.0`).

---

## ✅ Quick Fix (Run on VPS)

### **Option 1: Move File to Correct Location (Recommended)**

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

### **Option 2: Update Database Only (If File Should Stay in temp)**

```bash
# Update database filepath to match actual location
sudo -u postgres psql -d hisaabkitab_license -c "UPDATE pos_versions SET filepath = '/var/www/updates/hisaabkitab/windows/temp/nvm-setup.exe', download_url = 'https://api.zentryasolutions.com/pos-updates/files/windows/temp/nvm-setup.exe' WHERE version = '1.0.0';"
```

**But this won't work because the URL structure expects version in the path!**

---

## 🔍 Root Cause

The upload logic uses `req.body.version` to determine the directory, but when multer processes the file, the body might not be parsed yet, so it defaults to `'temp'`.

**Fix needed in code:** The upload handler should use the version from the request body after validation.

---

## 🚀 Complete Fix Script

```bash
#!/bin/bash
# Fix file path mismatch for version 1.0.0

VERSION="1.0.0"
FILE_NAME="nvm-setup.exe"
OLD_PATH="/var/www/updates/hisaabkitab/windows/temp/${FILE_NAME}"
NEW_DIR="/var/www/updates/hisaabkitab/windows/${VERSION}"
NEW_PATH="${NEW_DIR}/${FILE_NAME}"

echo "Fixing file path mismatch..."
echo ""

# 1. Check if old file exists
if [ -f "$OLD_PATH" ]; then
    echo "✅ Found file at: $OLD_PATH"
    
    # 2. Create new directory
    echo "Creating directory: $NEW_DIR"
    sudo mkdir -p "$NEW_DIR"
    
    # 3. Move file
    echo "Moving file to: $NEW_PATH"
    sudo mv "$OLD_PATH" "$NEW_PATH"
    
    # 4. Fix permissions
    echo "Fixing permissions..."
    sudo chown -R www-data:www-data /var/www/updates/hisaabkitab
    sudo chmod -R 755 /var/www/updates/hisaabkitab
    
    # 5. Update database
    echo "Updating database..."
    sudo -u postgres psql -d hisaabkitab_license -c "UPDATE pos_versions SET filepath = '$NEW_PATH' WHERE version = '$VERSION';"
    
    # 6. Verify
    echo ""
    echo "Verification:"
    if [ -f "$NEW_PATH" ]; then
        echo "✅ File exists at correct location"
        ls -lh "$NEW_PATH"
    else
        echo "❌ File move failed"
    fi
    
    # 7. Test backend
    echo ""
    echo "Testing backend..."
    curl -I http://localhost:3001/pos-updates/files/windows/${VERSION}/${FILE_NAME} 2>&1 | head -3
    
else
    echo "❌ File not found at: $OLD_PATH"
    echo "Searching for file..."
    find /var/www -name "$FILE_NAME" 2>/dev/null
fi
```

---

## 🔧 Fix Upload Code (Prevent Future Issues)

The upload code should ensure the version is available when creating the directory. The issue is in the multer configuration - it uses `req.body.version` which might not be parsed yet.

**Current code issue:**
```javascript
destination: (req, file, cb) => {
    const version = req.body.version || 'temp';  // Might be undefined!
    // ...
}
```

**Should be fixed to:**
- Use multipart form data parsing
- Or move file after upload completes
- Or use a temporary location and move after validation

---

## ✅ Quick One-Line Fix

```bash
sudo mkdir -p /var/www/updates/hisaabkitab/windows/1.0.0 && sudo mv /var/www/updates/hisaabkitab/windows/temp/nvm-setup.exe /var/www/updates/hisaabkitab/windows/1.0.0/nvm-setup.exe && sudo chown -R www-data:www-data /var/www/updates/hisaabkitab && sudo -u postgres psql -d hisaabkitab_license -c "UPDATE pos_versions SET filepath = '/var/www/updates/hisaabkitab/windows/1.0.0/nvm-setup.exe' WHERE version = '1.0.0';" && curl -I http://localhost:3001/pos-updates/files/windows/1.0.0/nvm-setup.exe
```

---

## 🔍 Why Download URL Opens But Doesn't Download

If the URL opens but doesn't download, it might be:
1. **File doesn't exist at expected path** (this is the issue)
2. **Content-Type header issue** - Backend might be serving with wrong MIME type
3. **Content-Disposition header** - Should be `attachment` to force download

After moving the file, test again. If it still doesn't download, check the response headers.

---

**Run the fix commands above to move the file to the correct location!**


