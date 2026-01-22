# ⚡ Quick Deployment Guide

## 🚀 Fast Track to Production

### Step 1: Prepare Files Locally

```bash
# Build frontend
cd frontend
npm install
npm run build:prod
cd ..
```

### Step 2: Upload to Hostinger

Upload these folders/files to `/public_html/license-admin/`:
- `backend/` (entire folder)
- `frontend/build/` (entire build folder)
- `database/` (entire folder)
- `scripts/` (entire folder)
- `ecosystem.config.js`
- `package.json`

### Step 3: Create `.env` File

On server, create `backend/.env`:

```env
PORT=3000
NODE_ENV=production
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=license_admin
JWT_SECRET=generate_with_node_scripts_generate-jwt-secret.js
CORS_ORIGIN=https://license.zentryasolutions.com
ADMIN_USERNAME=superadmin
ADMIN_PASSWORD=ChangeMe123!
```

### Step 4: Install & Setup

```bash
cd /public_html/license-admin/backend
npm install --production

cd ..
node scripts/production-setup.js
```

### Step 5: Start with PM2

```bash
npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Step 6: Configure Node.js App in hPanel

1. Go to **Node.js** in hPanel
2. Create app:
   - **App Root**: `/public_html/license-admin/backend`
   - **App URL**: `license.zentryasolutions.com`
   - **Port**: `3000`

### Step 7: Test

Visit: `https://license.zentryasolutions.com`

Login: `superadmin` / `ChangeMe123!`

**⚠️ Change password immediately!**

---

## 📋 Full Documentation

See `DEPLOYMENT_PRODUCTION.md` for complete guide.


