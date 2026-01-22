# 🚀 Production Deployment Guide
## License Admin System - Hostinger Deployment

This guide will help you deploy the License Admin System to production on Hostinger at `https://license.zentryasolutions.com`.

---

## 📋 Prerequisites

- Hostinger hosting account with Node.js support
- PostgreSQL database access (via Hostinger hPanel)
- SSH access (if using VPS) or File Manager access
- Domain/subdomain configured: `license.zentryasolutions.com`

---

## 1️⃣ Subdomain & SSL Setup

### Step 1.1: Create Subdomain in hPanel

1. Log in to Hostinger hPanel
2. Navigate to **Domains** → **Subdomains**
3. Create new subdomain:
   - **Subdomain**: `license`
   - **Document Root**: `/public_html/license-admin`
   - Click **Create**

### Step 1.2: Install SSL Certificate

1. In hPanel, go to **SSL** section
2. Find `license.zentryasolutions.com`
3. Click **Install SSL** (Let's Encrypt is free and recommended)
4. Wait for SSL activation (usually 5-10 minutes)
5. Verify SSL is active: Visit `https://license.zentryasolutions.com`

---

## 2️⃣ Database Setup

### Step 2.1: Create PostgreSQL Database

1. In hPanel, go to **Databases** → **PostgreSQL Databases**
2. Create new database:
   - **Database Name**: `license_admin`
   - **Username**: `license_admin_user` (or your preferred name)
   - **Password**: Generate a strong password (save it!)
   - Click **Create**

### Step 2.2: Note Database Connection Details

Save these details for `.env` file:
- **Host**: Usually `localhost` or provided by Hostinger
- **Port**: Usually `5432`
- **Database Name**: `license_admin`
- **Username**: Your created username
- **Password**: Your created password

---

## 3️⃣ Upload Files to Server

### Step 3.1: Prepare Files Locally

On your local machine:

```bash
# Build frontend
cd frontend
npm install
npm run build

# Go back to root
cd ..
```

### Step 3.2: Upload via FTP/SFTP or File Manager

Upload the following structure to `/public_html/license-admin/`:

```
license-admin/
├── backend/
│   ├── config/
│   ├── middleware/
│   ├── routes/
│   ├── utils/
│   ├── index.js
│   ├── package.json
│   └── .env (create this - see Step 4)
├── frontend/
│   └── build/ (upload the entire build folder)
├── database/
│   └── 02_COMPLETE_SETUP.sql
├── scripts/
│   ├── production-setup.js
│   ├── backup-database.js
│   └── generate-jwt-secret.js
├── ecosystem.config.js
└── package.json
```

**Important**: Do NOT upload:
- `node_modules/` folders
- `.env` files (create on server)
- `.git/` folder
- Development files

---

## 4️⃣ Configure Environment Variables

### Step 4.1: Generate JWT Secret

On your local machine or server:

```bash
node scripts/generate-jwt-secret.js
```

Copy the generated secret.

### Step 4.2: Create `.env` File

On the server, create `/public_html/license-admin/backend/.env`:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=license_admin_user
DB_PASSWORD=your_database_password_here
DB_NAME=license_admin

# JWT Secret (paste the generated secret)
JWT_SECRET=paste_generated_secret_here_minimum_64_characters

# CORS Origin
CORS_ORIGIN=https://license.zentryasolutions.com

# Admin User (for initial setup)
ADMIN_USERNAME=superadmin
ADMIN_PASSWORD=ChangeMe123!
```

**⚠️ Security**: Make sure `.env` file has proper permissions (600) and is never committed to git.

---

## 5️⃣ Install Dependencies

### Step 5.1: Install Backend Dependencies

SSH into your server or use Terminal in hPanel:

```bash
cd /public_html/license-admin/backend
npm install --production
```

### Step 5.2: Verify Installation

```bash
node -v  # Should show Node.js version
npm -v   # Should show npm version
```

---

## 6️⃣ Database Initialization

### Step 6.1: Run Production Setup Script

```bash
cd /public_html/license-admin
node scripts/production-setup.js
```

This will:
- Create all database tables
- Set up indexes
- Create initial admin user
- Verify database structure

### Step 6.2: Verify Database

Check that tables were created:
- `adminusers`
- `licenses`
- `activations`
- `auditlogs`

---

## 7️⃣ Process Management (PM2)

### Step 7.1: Install PM2 Globally

```bash
npm install -g pm2
```

### Step 7.2: Start Application with PM2

```bash
cd /public_html/license-admin
pm2 start ecosystem.config.js --env production
```

### Step 7.3: Configure PM2 to Auto-Start

```bash
# Save PM2 process list
pm2 save

# Generate startup script
pm2 startup

# Follow the instructions shown (usually involves running a sudo command)
```

### Step 7.4: Useful PM2 Commands

```bash
pm2 status              # Check application status
pm2 logs license-admin  # View logs
pm2 restart license-admin  # Restart application
pm2 stop license-admin     # Stop application
pm2 monit              # Monitor resources
```

---

## 8️⃣ Configure Web Server (Nginx/Apache)

### Option A: Using Node.js App in hPanel

If Hostinger provides Node.js app configuration:

1. Go to **Node.js** section in hPanel
2. Create new Node.js app:
   - **App Name**: `license-admin`
   - **App Root**: `/public_html/license-admin/backend`
   - **App URL**: `license.zentryasolutions.com`
   - **App Port**: `3000`
   - **Start Command**: `pm2 start ecosystem.config.js --env production`
   - **Node Version**: Latest LTS (18.x or 20.x)

### Option B: Manual Nginx Configuration

If you have access to Nginx config, add:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name license.zentryasolutions.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name license.zentryasolutions.com;

    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 9️⃣ Set Up Backups

### Step 9.1: Create Backup Script

The backup script is already created at `scripts/backup-database.js`.

### Step 9.2: Set Up Cron Job

Add to crontab (run `crontab -e`):

```bash
# Daily backup at 2 AM
0 2 * * * /usr/bin/node /public_html/license-admin/scripts/backup-database.js >> /public_html/license-admin/logs/backup.log 2>&1
```

Or via hPanel Cron Jobs:
- **Command**: `/usr/bin/node /public_html/license-admin/scripts/backup-database.js`
- **Schedule**: Daily at 2:00 AM
- **Output**: `/public_html/license-admin/logs/backup.log`

---

## 🔟 Testing & Verification

### Step 10.1: Test Health Endpoint

```bash
curl https://license.zentryasolutions.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-22T...",
  "environment": "production"
}
```

### Step 10.2: Test Admin Login

1. Open browser: `https://license.zentryasolutions.com`
2. Login with:
   - **Username**: `superadmin`
   - **Password**: `ChangeMe123!` (or the password you set)
3. **⚠️ IMPORTANT**: Change password immediately after first login!

### Step 10.3: Test API Endpoints

Using Postman or curl:

```bash
# Test license validation (POS endpoint)
curl -X POST https://license.zentryasolutions.com/api/license/validate \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "HK-TEST-XXXX-XXXX",
    "deviceId": "test-device-123"
  }'

# Test license status
curl https://license.zentryasolutions.com/api/license/status?licenseKey=HK-TEST-XXXX-XXXX
```

### Step 10.4: Verify All Features

- ✅ Create new license
- ✅ Edit license
- ✅ Revoke license
- ✅ View activations
- ✅ Dashboard statistics
- ✅ Audit logs

---

## 1️⃣1️⃣ Security Checklist

- [ ] SSL certificate installed and active
- [ ] `.env` file has secure permissions (600)
- [ ] Admin password changed from default
- [ ] JWT secret is strong and unique
- [ ] Database password is strong
- [ ] Rate limiting is active
- [ ] HTTPS enforcement is working
- [ ] CORS is configured correctly
- [ ] Logs directory has proper permissions
- [ ] Backups are scheduled and working
- [ ] PM2 auto-restart is configured

---

## 1️⃣2️⃣ Monitoring & Maintenance

### View Logs

```bash
# Application logs
pm2 logs license-admin

# Access logs
tail -f /public_html/license-admin/backend/logs/access.log

# Error logs
tail -f /public_html/license-admin/backend/logs/error.log

# Backup logs
tail -f /public_html/license-admin/logs/backup.log
```

### Check Application Status

```bash
pm2 status
pm2 monit
```

### Restart Application

```bash
pm2 restart license-admin
```

### Update Application

1. Upload new files
2. Install dependencies: `npm install --production`
3. Rebuild frontend: `cd frontend && npm run build`
4. Restart: `pm2 restart license-admin`

---

## 1️⃣3️⃣ POS Integration

### API Endpoints for POS

**Base URL**: `https://license.zentryasolutions.com/api/license`

#### 1. Validate/Activate License

```http
POST /api/license/validate
Content-Type: application/json

{
  "licenseKey": "HK-XXXX-XXXX-XXXX",
  "deviceId": "unique-device-id"
}
```

**Response (200 OK)**:
```json
{
  "valid": true,
  "license": {
    "licenseKey": "HK-XXXX-XXXX-XXXX",
    "tenantName": "Customer Name",
    "maxDevices": 5,
    "maxUsers": 10,
    "features": {...},
    "expiryDate": "2024-12-31"
  }
}
```

**Response (403 Forbidden)**:
```json
{
  "valid": false,
  "error": "License revoked"
}
```

#### 2. Check License Status

```http
GET /api/license/status?licenseKey=HK-XXXX-XXXX-XXXX
```

**Response**:
```json
{
  "valid": true,
  "status": "active",
  "expiryDate": "2024-12-31",
  "maxDevices": 5,
  "currentDevices": 2
}
```

### Offline Grace Period

The POS should:
1. Store last valid license response locally (encrypted)
2. Use cached response if API is unavailable
3. Re-validate when connection is restored
4. Show warning if offline for > 7 days

---

## 1️⃣4️⃣ Troubleshooting

### Application Won't Start

1. Check PM2 logs: `pm2 logs license-admin`
2. Verify database connection in `.env`
3. Check port is not in use: `netstat -tulpn | grep 3000`
4. Verify Node.js version: `node -v` (should be 16+)

### Database Connection Error

1. Verify database credentials in `.env`
2. Check database exists in hPanel
3. Test connection: `psql -h localhost -U username -d license_admin`
4. Check firewall rules

### Frontend Not Loading

1. Verify `frontend/build` folder exists
2. Check file permissions
3. Verify static file serving in `backend/index.js`
4. Check browser console for errors

### SSL Issues

1. Verify SSL certificate is installed
2. Check certificate expiration
3. Ensure HTTPS redirect is working
4. Test with SSL Labs: https://www.ssllabs.com/ssltest/

---

## 1️⃣5️⃣ Support & Documentation

- **API Documentation**: See `API_DOCUMENTATION.md`
- **Database Schema**: See `database/02_COMPLETE_SETUP.sql`
- **Quick Start**: See `QUICK_START.md`

---

## ✅ Deployment Complete!

Your License Admin System is now live at:
**https://license.zentryasolutions.com**

**Default Admin Credentials** (change immediately!):
- Username: `superadmin`
- Password: `ChangeMe123!` (or your set password)

**Next Steps**:
1. Change admin password
2. Create your first license
3. Test POS integration
4. Set up monitoring alerts
5. Schedule regular backups

---

**Need Help?** Check logs in `/public_html/license-admin/backend/logs/` or contact support.

