# 🚀 License Admin System - Production Deployment

## Quick Start for Production

This system is ready for deployment to Hostinger at `https://license.zentryasolutions.com`.

### 📦 What's Included

- ✅ Production-ready Node.js backend with Express
- ✅ React frontend with production build configuration
- ✅ PostgreSQL database setup scripts
- ✅ PM2 process management configuration
- ✅ Automated backup scripts
- ✅ Security middleware (rate limiting, HTTPS enforcement)
- ✅ Comprehensive deployment documentation

### 🎯 Quick Deployment Steps

1. **Upload files** to `/public_html/license-admin/` on Hostinger
2. **Create `.env`** in `backend/` folder with production values
3. **Install dependencies**: `npm install --production` in backend
4. **Build frontend**: `cd frontend && npm run build:prod`
5. **Setup database**: `node scripts/production-setup.js`
6. **Start with PM2**: `pm2 start ecosystem.config.js --env production`

### 📚 Full Documentation

See **[DEPLOYMENT_PRODUCTION.md](./DEPLOYMENT_PRODUCTION.md)** for complete step-by-step deployment guide.

### 🔐 Default Admin Credentials

**⚠️ CHANGE IMMEDIATELY AFTER FIRST LOGIN!**

- Username: `superadmin`
- Password: `ChangeMe123!` (or password set in `.env`)

### 🌐 Production URL

**https://license.zentryasolutions.com**

### 📞 API Endpoints for POS

- **Validate License**: `POST /api/license/validate`
- **Check Status**: `GET /api/license/status?licenseKey=HK-XXXX-XXXX-XXXX`

Base URL: `https://license.zentryasolutions.com/api/license`

### 🛠️ Maintenance Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs license-admin

# Restart
pm2 restart license-admin

# Stop
pm2 stop license-admin
```

### 📋 Deployment Checklist

See **[PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)** for complete checklist.

---

**Need Help?** Check the deployment guide or review logs in `backend/logs/`


