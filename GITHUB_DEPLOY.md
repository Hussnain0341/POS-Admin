# 🚀 GitHub Deployment - Simple Guide

## ✅ Step 1: Push to GitHub (Local Machine)

Open PowerShell in your project directory and run:

```powershell
cd "E:\POS\POS Admin Pannel"

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - License Admin System"

# Set main branch
git branch -M main

# Add GitHub remote
git remote add origin https://github.com/Hussnain0341/POS-Admin.git

# Push to GitHub
git push -u origin main
```

**If you get authentication errors:**
- GitHub no longer accepts passwords
- Use a Personal Access Token:
  1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
  2. Generate new token with `repo` permissions
  3. Use token as password when pushing

## ✅ Step 2: Deploy on VPS

SSH into your VPS:

```bash
ssh root@147.79.117.39
```

Then run:

```bash
# Clone repository
cd /var/www
git clone https://github.com/Hussnain0341/POS-Admin.git license-admin
cd license-admin

# Run deployment script
chmod +x scripts/deploy-vps-from-github.sh
./scripts/deploy-vps-from-github.sh
```

## ✅ Step 3: Configure Environment

After deployment, edit the environment file:

```bash
cd /var/www/license-admin/backend
nano .env
```

Update these values:
- `DB_PASSWORD` - Your PostgreSQL password
- `JWT_SECRET` - Generate with: `openssl rand -hex 64`
- `CORS_ORIGIN` - Your domain URL

Save and restart:
```bash
pm2 restart license-admin
```

## 🔄 Updating the Application

### After Making Changes Locally:

**On Windows:**
```powershell
git add .
git commit -m "Your changes description"
git push origin main
```

**On VPS:**
```bash
cd /var/www/license-admin
git pull origin main

# If frontend changed, rebuild:
cd frontend
npm run build:prod
cd ..

# Restart app
pm2 restart license-admin
```

## 📝 Quick Reference

| Action | Local (Windows) | VPS (Linux) |
|--------|---------------|-------------|
| **Initial Setup** | `git push origin main` | `git clone ... && ./scripts/deploy-vps-from-github.sh` |
| **Update Code** | `git push origin main` | `git pull origin main && pm2 restart license-admin` |
| **Rebuild Frontend** | `npm run build:prod` | `cd frontend && npm run build:prod` |
| **Restart App** | N/A | `pm2 restart license-admin` |
| **View Logs** | N/A | `pm2 logs license-admin` |

## 🎯 That's It!

Now you can easily:
- ✅ Make changes locally
- ✅ Push to GitHub
- ✅ Pull on VPS
- ✅ Deploy updates quickly

