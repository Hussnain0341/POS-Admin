# 🚀 Deploy to VPS Server - Complete Guide

## 📋 Prerequisites

1. **SSH access to your VPS**
2. **Git installed on VPS**
3. **Node.js and npm installed**
4. **PostgreSQL installed and running**
5. **PM2 installed** (for process management)
6. **Nginx installed** (for reverse proxy)

---

## 🔧 Step-by-Step Deployment

### **Step 1: SSH into Your VPS**

```bash
ssh root@your-vps-ip
# or
ssh your-username@your-vps-ip
```

---

### **Step 2: Navigate to Project Directory**

```bash
# If project doesn't exist, create directory
mkdir -p /var/www/license-admin
cd /var/www/license-admin

# If project exists, navigate to it
cd /var/www/license-admin
```

---

### **Step 3: Pull Latest Code from GitHub**

```bash
# If first time, clone the repository
git clone https://github.com/Hussnain0341/POS-Admin.git .

# If repository already exists, pull latest changes
git pull origin main
```

---

### **Step 4: Run Database Migration**

```bash
# Connect to PostgreSQL
sudo -u postgres psql -d hisaabkitab_license

# Run the POS Updates migration
\i database/04_POS_UPDATES.sql

# Exit PostgreSQL
\q
```

**Or run from command line:**
```bash
sudo -u postgres psql -d hisaabkitab_license -f database/04_POS_UPDATES.sql
```

---

### **Step 5: Install Backend Dependencies**

```bash
cd /var/www/license-admin/backend
npm install
```

**Important:** Make sure `multer` is installed:
```bash
npm install multer
```

---

### **Step 6: Configure Environment Variables**

```bash
# Edit backend/.env file
nano backend/.env
```

**Add these lines (if not already present):**
```env
# POS Updates Configuration
UPDATES_BASE_DIR=/var/www/updates/hisaabkitab
UPDATES_PUBLIC_URL=https://api.zentryasolutions.com/pos-updates/files
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

---

### **Step 7: Create Upload Directory**

```bash
# Create directory for POS update files
sudo mkdir -p /var/www/updates/hisaabkitab/windows
sudo chown -R www-data:www-data /var/www/updates
sudo chmod -R 755 /var/www/updates
```

---

### **Step 8: Install Frontend Dependencies and Build**

```bash
cd /var/www/license-admin/frontend
npm install
npm run build
```

---

### **Step 9: Restart Backend with PM2**

```bash
cd /var/www/license-admin

# Stop existing process (if running)
pm2 stop license-admin || true
pm2 delete license-admin || true

# Start backend
pm2 start ecosystem.config.js
pm2 save
```

---

### **Step 10: Restart Nginx**

```bash
sudo systemctl restart nginx
sudo systemctl status nginx
```

---

## 🔄 Quick Update Script (For Future Updates)

Create a file `update-vps.sh` on your VPS:

```bash
#!/bin/bash
set -e

echo "🔄 Updating License Admin System..."

cd /var/www/license-admin

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Install frontend dependencies and build
echo "🏗️  Building frontend..."
cd ../frontend
npm install
npm run build

# Restart backend
echo "🔄 Restarting backend..."
cd ..
pm2 restart license-admin

echo "✅ Update complete!"
```

**Make it executable:**
```bash
chmod +x update-vps.sh
```

**Run it:**
```bash
./update-vps.sh
```

---

## 🧪 Verify Deployment

### **1. Check Backend is Running**
```bash
pm2 status
pm2 logs license-admin
```

### **2. Test API Endpoints**

```bash
# Health check
curl https://api.zentryasolutions.com/health

# Test POS updates API (should return 404 if no versions)
curl https://api.zentryasolutions.com/pos-updates/latest?platform=windows
```

### **3. Test Frontend**
- Visit: `https://api.zentryasolutions.com`
- Login with admin credentials
- Navigate to "Updates & Maintenance" in sidebar
- Should see the Updates dashboard

---

## 🐛 Troubleshooting

### **Backend Not Starting**
```bash
# Check logs
pm2 logs license-admin

# Check database connection
cd /var/www/license-admin/backend
node -e "require('./config/database').pool.query('SELECT NOW()').then(() => console.log('DB OK')).catch(e => console.error(e))"
```

### **404 Errors on API**
- Check Nginx configuration
- Verify routes are registered in `backend/index.js`
- Check PM2 is running: `pm2 status`

### **File Upload Fails**
```bash
# Check directory permissions
ls -la /var/www/updates/hisaabkitab

# Fix permissions if needed
sudo chown -R www-data:www-data /var/www/updates
sudo chmod -R 755 /var/www/updates
```

### **Database Migration Fails**
```bash
# Check if tables exist
sudo -u postgres psql -d hisaabkitab_license -c "\dt pos_*"

# Run migration manually
sudo -u postgres psql -d hisaabkitab_license -f database/04_POS_UPDATES.sql
```

---

## 📝 Important Notes

1. **Database Migration**: Run `04_POS_UPDATES.sql` only once
2. **File Permissions**: Ensure `/var/www/updates` is writable by Node.js process
3. **Environment Variables**: Update `UPDATES_BASE_DIR` and `UPDATES_PUBLIC_URL` in `backend/.env`
4. **SSL Certificate**: Ensure SSL is configured in Nginx for HTTPS
5. **PM2**: Use PM2 to keep backend running in production

---

## 🚀 Quick Deploy Command (One-Liner)

```bash
cd /var/www/license-admin && \
git pull origin main && \
cd backend && npm install && \
cd ../frontend && npm install && npm run build && \
cd .. && pm2 restart license-admin && \
echo "✅ Deployment complete!"
```

---

## ✅ Deployment Checklist

- [ ] Code pulled from GitHub
- [ ] Database migration run (`04_POS_UPDATES.sql`)
- [ ] Backend dependencies installed (`npm install` in backend/)
- [ ] Frontend built (`npm run build` in frontend/)
- [ ] Environment variables configured (`backend/.env`)
- [ ] Upload directory created (`/var/www/updates/hisaabkitab`)
- [ ] Backend restarted with PM2
- [ ] Nginx restarted
- [ ] Tested API endpoints
- [ ] Tested frontend login
- [ ] Tested Updates & Maintenance module

---

**Your application should now be live!** 🎉

