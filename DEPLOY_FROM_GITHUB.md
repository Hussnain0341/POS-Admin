# 🚀 Simple GitHub Deployment Guide

This guide shows you how to deploy from GitHub to your VPS.

## Step 1: Push to GitHub

### On Your Local Machine (Windows)

```bash
# Navigate to project directory
cd "E:\POS\POS Admin Pannel"

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - License Admin System"

# Set main branch
git branch -M main

# Add GitHub remote (use your repository URL)
git remote add origin https://github.com/Hussnain0341/POS-Admin.git

# Push to GitHub
git push -u origin main
```

**Note:** If you get authentication errors, you may need to:
- Use a Personal Access Token instead of password
- Or set up SSH keys

## Step 2: Deploy on VPS

### SSH into your VPS

```bash
ssh root@147.79.117.39
```

### Run the deployment script

```bash
# Clone the repository
cd /var/www
git clone https://github.com/Hussnain0341/POS-Admin.git license-admin
cd license-admin

# Run the deployment script
chmod +x scripts/deploy-vps-from-github.sh
./scripts/deploy-vps-from-github.sh
```

## Step 3: Update Application (After Making Changes)

### On Your Local Machine

```bash
# Make your changes
# ... edit files ...

# Commit changes
git add .
git commit -m "Your commit message"
git push origin main
```

### On VPS

```bash
cd /var/www/license-admin
git pull origin main

# Rebuild frontend if needed
cd frontend
npm install
npm run build:prod
cd ..

# Restart application
pm2 restart license-admin
```

## Quick Commands Reference

### Local (Windows)
```bash
git add .
git commit -m "message"
git push origin main
```

### VPS (Linux)
```bash
cd /var/www/license-admin
git pull origin main
pm2 restart license-admin
```

## Environment Setup

After cloning on VPS, create `.env` file:

```bash
cd /var/www/license-admin/backend
cp .env.example .env
nano .env  # Edit with your values
```

