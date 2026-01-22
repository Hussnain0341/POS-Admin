#!/bin/bash
# ============================================
# VPS Cleanup Script
# Removes all unnecessary files and processes
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}🧹 VPS CLEANUP SCRIPT${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# ============================================
# STEP 1: CHECK CURRENT STATUS
# ============================================
echo -e "${YELLOW}📊 Step 1: Checking current status...${NC}"
echo ""

echo "PM2 Processes:"
pm2 list || echo "   No PM2 processes"
echo ""

echo "Running Services:"
systemctl list-units --type=service --state=running | grep -E "(nginx|postgresql|node|license)" || echo "   No relevant services"
echo ""

echo "Disk Usage:"
df -h / | tail -1
echo ""

echo "Directories in /var/www:"
ls -la /var/www 2>/dev/null || echo "   /var/www does not exist"
echo ""

echo "Directories in /root:"
ls -la /root | grep -E "^d" | awk '{print $9}' | grep -v "^\." | head -10
echo ""

# ============================================
# STEP 2: STOP ALL SERVICES
# ============================================
echo -e "${YELLOW}🛑 Step 2: Stopping all services...${NC}"

# Stop PM2 processes
if command -v pm2 &> /dev/null; then
    echo "   Stopping all PM2 processes..."
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    pm2 kill 2>/dev/null || true
    echo -e "   ${GREEN}✅ PM2 processes stopped${NC}"
fi

# Stop Nginx
if systemctl is-active --quiet nginx 2>/dev/null; then
    echo "   Stopping Nginx..."
    systemctl stop nginx
    echo -e "   ${GREEN}✅ Nginx stopped${NC}"
fi

# Stop PostgreSQL (optional - comment out if you want to keep it)
# if systemctl is-active --quiet postgresql 2>/dev/null; then
#     echo "   Stopping PostgreSQL..."
#     systemctl stop postgresql
#     echo -e "   ${GREEN}✅ PostgreSQL stopped${NC}"
# fi

echo ""

# ============================================
# STEP 3: REMOVE PROJECT DIRECTORIES
# ============================================
echo -e "${YELLOW}🗑️  Step 3: Removing project directories...${NC}"

# Remove old project directories
DIRS_TO_REMOVE=(
    "/var/www/license-admin"
    "/var/www/license-admin-old"
    "/root/license-admin"
    "/root/slack-api"
    "/root/license"
    "/var/www/slack-api"
)

for dir in "${DIRS_TO_REMOVE[@]}"; do
    if [ -d "$dir" ]; then
        echo "   Removing $dir..."
        rm -rf "$dir"
        echo -e "   ${GREEN}✅ Removed $dir${NC}"
    fi
done

echo ""

# ============================================
# STEP 4: CLEAN UP FILES
# ============================================
echo -e "${YELLOW}🧹 Step 4: Cleaning up files...${NC}"

# Remove PM2 logs and data
if [ -d "/root/.pm2" ]; then
    echo "   Removing PM2 data..."
    rm -rf /root/.pm2
    echo -e "   ${GREEN}✅ PM2 data removed${NC}"
fi

# Remove npm cache
if [ -d "/root/.npm" ]; then
    echo "   Cleaning npm cache..."
    npm cache clean --force 2>/dev/null || true
    rm -rf /root/.npm
    echo -e "   ${GREEN}✅ npm cache cleaned${NC}"
fi

# Remove old logs
echo "   Removing old log files..."
find /root -name "*.log" -type f -delete 2>/dev/null || true
find /var/log -name "*license*" -type f -delete 2>/dev/null || true
echo -e "   ${GREEN}✅ Log files removed${NC}"

# Remove temporary files
echo "   Removing temporary files..."
rm -rf /tmp/* 2>/dev/null || true
rm -rf /root/tmp 2>/dev/null || true
rm -rf /root/temp 2>/dev/null || true
echo -e "   ${GREEN}✅ Temporary files removed${NC}"

# Remove old history files
echo "   Cleaning history files..."
rm -f /root/.mysql_history 2>/dev/null || true
rm -f /root/.node_repl_history 2>/dev/null || true
echo -e "   ${GREEN}✅ History files cleaned${NC}"

echo ""

# ============================================
# STEP 5: REMOVE NGINX CONFIGURATIONS
# ============================================
echo -e "${YELLOW}🌐 Step 5: Removing Nginx configurations...${NC}"

# Remove site configurations
if [ -f "/etc/nginx/sites-enabled/license.zentryasolutions.com" ]; then
    echo "   Removing Nginx site configuration..."
    rm -f /etc/nginx/sites-enabled/license.zentryasolutions.com
    rm -f /etc/nginx/sites-available/license.zentryasolutions.com
    echo -e "   ${GREEN}✅ Nginx configuration removed${NC}"
fi

# Restore default Nginx config if needed
if [ ! -f "/etc/nginx/sites-enabled/default" ]; then
    echo "   Restoring default Nginx configuration..."
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
    echo -e "   ${GREEN}✅ Default Nginx config restored${NC}"
fi

echo ""

# ============================================
# STEP 6: CLEAN UP SYSTEM
# ============================================
echo -e "${YELLOW}🔧 Step 6: System cleanup...${NC}"

# Clean apt cache
echo "   Cleaning apt cache..."
apt-get clean 2>/dev/null || true
apt-get autoclean 2>/dev/null || true
echo -e "   ${GREEN}✅ Apt cache cleaned${NC}"

# Remove unused packages (optional - be careful)
# echo "   Removing unused packages..."
# apt-get autoremove -y 2>/dev/null || true

echo ""

# ============================================
# STEP 7: VERIFY CLEANUP
# ============================================
echo -e "${YELLOW}✅ Step 7: Verifying cleanup...${NC}"
echo ""

echo "PM2 Status:"
pm2 list 2>/dev/null || echo "   ✅ No PM2 processes"
echo ""

echo "Directories in /var/www:"
ls -la /var/www 2>/dev/null || echo "   ✅ /var/www is empty or doesn't exist"
echo ""

echo "Directories in /root (excluding hidden):"
ls -d /root/*/ 2>/dev/null | wc -l | xargs -I {} echo "   {} directories found"
echo ""

echo "Disk Usage After Cleanup:"
df -h / | tail -1
echo ""

echo "Running Services:"
systemctl list-units --type=service --state=running | grep -E "(nginx|postgresql|node|license)" || echo "   ✅ No relevant services running"
echo ""

# ============================================
# SUMMARY
# ============================================
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}✅ CLEANUP COMPLETE!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${BLUE}📝 What was removed:${NC}"
echo "   ✓ All PM2 processes and data"
echo "   ✓ Project directories (/var/www/license-admin, etc.)"
echo "   ✓ npm cache and temporary files"
echo "   ✓ Old log files"
echo "   ✓ Nginx site configurations"
echo "   ✓ System cache"
echo ""
echo -e "${BLUE}📊 Current Status:${NC}"
echo "   • PM2: Stopped and removed"
echo "   • Nginx: Stopped (default config restored)"
echo "   • PostgreSQL: Still installed (not removed)"
echo "   • Node.js: Still installed (not removed)"
echo ""
echo -e "${YELLOW}⚠️  Note:${NC}"
echo "   • PostgreSQL and Node.js are still installed"
echo "   • You can now run the deployment script fresh"
echo "   • All project data has been removed"
echo ""
echo -e "${GREEN}🎉 VPS is now clean and ready for fresh deployment!${NC}"
echo ""

