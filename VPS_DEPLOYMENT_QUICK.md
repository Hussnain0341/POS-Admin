# 🚀 Quick VPS Deployment Guide

## ✅ Code Pushed to GitHub
**Repository:** https://github.com/Hussnain0341/POS-Admin  
**Branch:** main

---

## 📋 Quick Deployment Steps (SSH into VPS)

### **Option 1: First Time Setup (Full Deployment)**

```bash
# 1. SSH into VPS
ssh root@your-vps-ip

# 2. Navigate to web directory
cd /var/www

# 3. Clone repository (if first time)
git clone https://github.com/Hussnain0341/POS-Admin.git license-admin
cd license-admin

# 4. Run database migration
sudo -u postgres psql -d hisaabkitab_license -f database/04_POS_UPDATES.sql

# 5. Install backend dependencies
cd backend
npm install
npm install multer  # Required for file uploads

# 6. Configure environment variables
nano .env
# Add these lines:
# UPDATES_BASE_DIR=/var/www/updates/hisaabkitab
# UPDATES_PUBLIC_URL=https://api.zentryasolutions.com/pos-updates/files

# 7. Create upload directory
sudo mkdir -p /var/www/updates/hisaabkitab/windows
sudo chown -R www-data:www-data /var/www/updates
sudo chmod -R 755 /var/www/updates

# 8. Build frontend
cd ../frontend
npm install
npm run build

# 9. Start backend with PM2
cd ..
pm2 start ecosystem.config.js
pm2 save

# 10. Restart Nginx
sudo systemctl restart nginx
```

---

### **Option 2: Quick Update (If Already Deployed)**

```bash
# 1. SSH into VPS
ssh root@your-vps-ip

# 2. Navigate to project
cd /var/www/license-admin

# 3. Pull latest code
git pull origin main

# 4. Install dependencies and build
cd backend && npm install && cd ../frontend && npm install && npm run build && cd ..

# 5. Restart backend
pm2 restart license-admin

# 6. Done! ✅
```

---

## 🔄 One-Line Update Command

```bash
cd /var/www/license-admin && git pull origin main && cd backend && npm install && cd ../frontend && npm install && npm run build && cd .. && pm2 restart license-admin && echo "✅ Done!"
```

---

## 📝 Important: Database Migration

**Run this ONCE to create POS Updates tables:**

```bash
sudo -u postgres psql -d hisaabkitab_license -f database/04_POS_UPDATES.sql
```

**Or in pgAdmin:**
1. Connect to `hisaabkitab_license` database
2. Open Query Tool
3. Copy and paste contents of `database/04_POS_UPDATES.sql`
4. Execute (F5)

---

## ⚙️ Environment Variables

**Edit `backend/.env` and add:**

```env
# POS Updates Configuration
UPDATES_BASE_DIR=/var/www/updates/hisaabkitab
UPDATES_PUBLIC_URL=https://api.zentryasolutions.com/pos-updates/files
```

---

## 📁 File Permissions

```bash
# Create and set permissions for upload directory
sudo mkdir -p /var/www/updates/hisaabkitab/windows
sudo chown -R www-data:www-data /var/www/updates
sudo chmod -R 755 /var/www/updates
```

---

## ✅ Verification

After deployment, test:

1. **Backend Health:**
   ```bash
   curl https://api.zentryasolutions.com/health
   ```

2. **Frontend:**
   - Visit: `https://api.zentryasolutions.com`
   - Login
   - Check "Updates & Maintenance" in sidebar

3. **PM2 Status:**
   ```bash
   pm2 status
   pm2 logs license-admin
   ```

---

## 🐛 Troubleshooting

### **Backend Not Starting:**
```bash
pm2 logs license-admin
# Check for database connection errors
```

### **404 on API:**
- Verify routes in `backend/index.js`
- Check PM2 is running: `pm2 status`
- Restart: `pm2 restart license-admin`

### **File Upload Fails:**
```bash
# Check permissions
ls -la /var/www/updates/hisaabkitab
# Fix if needed
sudo chown -R www-data:www-data /var/www/updates
```

---

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| Pull code | `git pull origin main` |
| Install backend deps | `cd backend && npm install` |
| Build frontend | `cd frontend && npm run build` |
| Restart backend | `pm2 restart license-admin` |
| Check logs | `pm2 logs license-admin` |
| Check status | `pm2 status` |

---

**Your code is ready to deploy!** 🚀

