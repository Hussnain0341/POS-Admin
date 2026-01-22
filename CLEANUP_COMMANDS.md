# 🧹 VPS Cleanup Commands

Quick commands to clean up your VPS before fresh deployment.

## Quick Cleanup (Copy & Paste)

```bash
# Download cleanup script
curl -o cleanup-vps.sh https://raw.githubusercontent.com/Hussnain0341/POS-Admin/main/cleanup-vps.sh
chmod +x cleanup-vps.sh
bash cleanup-vps.sh
```

## Manual Cleanup Commands

If you prefer to run commands manually:

### 1. Check Current Status
```bash
# Check PM2 processes
pm2 list

# Check running services
systemctl list-units --type=service --state=running | grep -E "(nginx|postgresql|node|license)"

# Check disk usage
df -h

# Check directories
ls -la /var/www
ls -la /root
```

### 2. Stop All Services
```bash
# Stop PM2
pm2 stop all
pm2 delete all
pm2 kill

# Stop Nginx
systemctl stop nginx
```

### 3. Remove Project Directories
```bash
# Remove old projects
rm -rf /var/www/license-admin
rm -rf /var/www/license-admin-old
rm -rf /root/license-admin
rm -rf /root/slack-api
rm -rf /var/www/slack-api
```

### 4. Clean Up Files
```bash
# Remove PM2 data
rm -rf /root/.pm2

# Clean npm cache
npm cache clean --force
rm -rf /root/.npm

# Remove logs
find /root -name "*.log" -type f -delete
find /var/log -name "*license*" -type f -delete

# Remove temporary files
rm -rf /tmp/*
rm -rf /root/tmp
rm -rf /root/temp

# Clean history
rm -f /root/.mysql_history
rm -f /root/.node_repl_history
```

### 5. Remove Nginx Configurations
```bash
# Remove site config
rm -f /etc/nginx/sites-enabled/license.zentryasolutions.com
rm -f /etc/nginx/sites-available/license.zentryasolutions.com

# Restore default
cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    root /var/www/html;
    index index.html index.htm index.nginx-debian.html;
    server_name _;
    location / {
        try_files $uri $uri/ =404;
    }
}
EOF
ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
```

### 6. System Cleanup
```bash
# Clean apt cache
apt-get clean
apt-get autoclean
```

### 7. Verify Cleanup
```bash
# Check PM2
pm2 list

# Check directories
ls -la /var/www
ls -la /root

# Check disk usage
df -h

# Check services
systemctl status nginx
systemctl status postgresql
```

## One-Line Complete Cleanup

```bash
pm2 stop all && pm2 delete all && pm2 kill && systemctl stop nginx && rm -rf /var/www/license-admin /root/license-admin /root/slack-api /var/www/slack-api /root/.pm2 /root/.npm && find /root -name "*.log" -type f -delete && rm -f /etc/nginx/sites-enabled/license.zentryasolutions.com /etc/nginx/sites-available/license.zentryasolutions.com && apt-get clean && echo "✅ Cleanup complete!"
```

## After Cleanup

Your VPS is now clean. You can:
1. Run the deployment script: `bash deploy-vps-auto.sh`
2. Or start fresh with manual setup

---

**⚠️ Note:** These commands remove project data but keep system packages (Node.js, PostgreSQL, Nginx) installed.

