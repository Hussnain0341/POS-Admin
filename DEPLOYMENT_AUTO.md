# 🚀 Automated VPS Deployment Guide

## One-Click Deployment Script

This guide explains how to deploy the HisaabKitab License Admin System to your VPS using a single automated script.

## Prerequisites

- VPS with root/SSH access (Hostinger VPS recommended)
- Domain name pointing to your VPS IP (e.g., `license.zentryasolutions.com`)
- GitHub repository access

## Quick Start

### Step 1: Connect to Your VPS

```bash
ssh root@YOUR_VPS_IP
# Password: Your VPS password
```

### Step 2: Download and Run the Deployment Script

```bash
# Download the script from GitHub
curl -o deploy-vps-auto.sh https://raw.githubusercontent.com/Hussnain0341/POS-Admin/main/deploy-vps-auto.sh

# OR clone the repository
git clone https://github.com/Hussnain0341/POS-Admin.git /var/www/license-admin
cd /var/www/license-admin

# Make script executable
chmod +x deploy-vps-auto.sh

# Run the deployment script
bash deploy-vps-auto.sh
```

**That's it!** The script will automatically:

1. ✅ Install all prerequisites (Node.js, PostgreSQL, Nginx, PM2, Certbot)
2. ✅ Clone/pull code from GitHub
3. ✅ Set up PostgreSQL database
4. ✅ Run database schema (SETUP.sql)
5. ✅ Create .env configuration file
6. ✅ Install all dependencies (backend + frontend)
7. ✅ Build React frontend
8. ✅ Configure Nginx reverse proxy
9. ✅ Set up SSL certificate (Let's Encrypt)
10. ✅ Configure PM2 process manager
11. ✅ Start all services
12. ✅ Verify deployment

## What the Script Does

### Automatic Installation

The script checks for and installs:
- **Node.js 18.x** (if not installed)
- **PostgreSQL** (if not installed)
- **Nginx** (if not installed)
- **PM2** (if not installed)
- **Certbot** (for SSL certificates)

### Database Setup

- Creates database: `hisaabkitab_license`
- Runs complete schema from `database/SETUP.sql`
- Sets up default admin user: `admin` / `admin123`

### Configuration

- Creates `backend/.env` with production settings
- Configures API URL for frontend
- Sets up Nginx reverse proxy
- Configures SSL with Let's Encrypt

### Service Management

- Starts PostgreSQL
- Starts Nginx
- Starts application with PM2
- Sets up PM2 auto-start on reboot

## Default Configuration

The script uses these defaults (you can edit the script to change them):

```bash
DOMAIN="license.zentryasolutions.com"
DB_NAME="hisaabkitab_license"
DB_USER="postgres"
DB_PASSWORD="Hussn@in0341"
BACKEND_PORT="3000"
```

## After Deployment

### Access Your Application

- **URL**: `https://license.zentryasolutions.com`
- **Login**: `admin` / `admin123`
- **⚠️ IMPORTANT**: Change the default password immediately!

### Useful Commands

```bash
# View application logs
pm2 logs license-admin

# Restart application
pm2 restart license-admin

# Check application status
pm2 status

# Update code from GitHub
cd /var/www/license-admin
git pull origin main
pm2 restart license-admin

# View Nginx logs
tail -f /var/log/nginx/error.log

# Check database connection
psql -U postgres -d hisaabkitab_license
```

### Update SMTP for 2FA

Edit the `.env` file to enable 2FA email:

```bash
nano /var/www/license-admin/backend/.env
```

Update these lines:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com
```

Then restart:
```bash
pm2 restart license-admin
```

## Troubleshooting

### Application Not Starting

```bash
# Check PM2 logs
pm2 logs license-admin --lines 50

# Check if port is in use
netstat -tulpn | grep 3000

# Restart PM2
pm2 restart license-admin
```

### Database Connection Issues

```bash
# Check PostgreSQL status
systemctl status postgresql

# Check database exists
psql -U postgres -l | grep hisaabkitab_license

# Test connection
psql -U postgres -d hisaabkitab_license -c "SELECT 1;"
```

### SSL Certificate Issues

```bash
# Check certificate status
certbot certificates

# Renew certificate manually
certbot renew

# Test Nginx configuration
nginx -t
systemctl reload nginx
```

### Frontend Not Loading

```bash
# Check if build directory exists
ls -la /var/www/license-admin/frontend/build

# Rebuild frontend
cd /var/www/license-admin/frontend
npm run build

# Restart application
pm2 restart license-admin
```

## Manual Configuration

If you need to customize the deployment, edit the script variables:

```bash
nano deploy-vps-auto.sh
```

Change these variables at the top:
- `GITHUB_REPO`: Your GitHub repository URL
- `DEPLOY_PATH`: Where to deploy (default: `/var/www/license-admin`)
- `DOMAIN`: Your domain name
- `DB_NAME`: Database name
- `DB_USER`: PostgreSQL user
- `DB_PASSWORD`: PostgreSQL password

## Security Checklist

After deployment, ensure:

- [ ] Default admin password is changed
- [ ] Strong JWT_SECRET is set in `.env`
- [ ] SMTP credentials are configured for 2FA
- [ ] Firewall is configured (UFW recommended)
- [ ] Regular backups are set up
- [ ] SSL certificate auto-renewal is working

## Support

If you encounter issues:

1. Check the logs: `pm2 logs license-admin`
2. Verify all services are running: `pm2 status && systemctl status nginx && systemctl status postgresql`
3. Review the script output for error messages
4. Check GitHub issues: https://github.com/Hussnain0341/POS-Admin/issues

## Next Steps

1. ✅ Change default admin password
2. ✅ Configure SMTP for 2FA
3. ✅ Test login functionality
4. ✅ Create your first license
5. ✅ Test POS integration APIs

---

**🎉 Your License Admin System is now live and ready to use!**

