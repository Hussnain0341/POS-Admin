# 🚀 DEPLOY NOW - Quick Guide

## ✅ What's Ready

1. ✅ Frontend built for production
2. ✅ Deployment package created in `deploy-package/` folder
3. ✅ VPS deployment script ready
4. ✅ Database configuration fixed (PostgreSQL)

## 📤 Step 1: Upload to VPS

### Option A: Using SCP (Recommended if you have OpenSSH)

Open PowerShell or Git Bash and run:

```bash
scp -r deploy-package root@147.79.117.39:/var/www/license-admin
```

When prompted, enter password: `Hussn@in0341`

### Option B: Using WinSCP

1. Download and install [WinSCP](https://winscp.net/)
2. Connect to:
   - **Host:** `147.79.117.39`
   - **Username:** `root`
   - **Password:** `Hussn@in0341`
   - **Protocol:** SFTP
3. Navigate to `/var/www/`
4. Upload the entire `deploy-package` folder
5. Rename it to `license-admin` (or keep as is)

### Option C: Using FileZilla

1. Download [FileZilla](https://filezilla-project.org/)
2. Connect using SFTP with same credentials as above
3. Upload `deploy-package` folder to `/var/www/`

## 🔧 Step 2: SSH into VPS

```bash
ssh root@147.79.117.39
# Password: Hussn@in0341
```

## 🚀 Step 3: Run Deployment Script

Once connected via SSH:

```bash
cd /var/www/license-admin
chmod +x deploy-on-vps.sh
./deploy-on-vps.sh
```

This script will automatically:
- Install Node.js, PostgreSQL, Nginx, PM2
- Set up the database
- Configure Nginx reverse proxy
- Set up SSL certificate
- Start the application

**Note:** The script may take 5-10 minutes to complete.

## ✅ Step 4: Verify Deployment

1. Visit: **https://license.zentryasolutions.com**
2. Login with:
   - **Username:** `admin`
   - **Password:** `admin123`
3. ⚠️ **IMPORTANT:** Change the default password immediately!

## 🔍 Troubleshooting

### Check Application Status
```bash
pm2 status
pm2 logs license-admin
```

### Check Nginx
```bash
systemctl status nginx
tail -f /var/log/nginx/error.log
```

### Restart Application
```bash
pm2 restart license-admin
```

### View Full Instructions
See `deploy-package/DEPLOY_INSTRUCTIONS.md` for detailed troubleshooting.

## 📝 What the Deployment Includes

- ✅ Node.js 18.x
- ✅ PostgreSQL database
- ✅ Nginx reverse proxy
- ✅ SSL certificate (Let's Encrypt)
- ✅ PM2 process manager
- ✅ Production-ready configuration
- ✅ Automatic startup on server reboot

## 🎯 Next Steps After Deployment

1. Change default admin password
2. Update database password in `backend/.env` if needed
3. Set up regular database backups
4. Configure firewall (UFW)
5. Monitor application logs

---

**Ready to deploy?** Follow the steps above! 🚀

