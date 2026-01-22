#!/bin/bash
# Production Deployment Script
# Run this script to deploy to production

set -e  # Exit on error

echo "🚀 Starting production deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    echo -e "${RED}❌ Error: backend/.env file not found!${NC}"
    echo "Please create backend/.env with production configuration."
    exit 1
fi

# Build frontend
echo -e "${YELLOW}📦 Building frontend...${NC}"
cd frontend
npm install
npm run build:prod
cd ..

# Check if build was successful
if [ ! -d "frontend/build" ]; then
    echo -e "${RED}❌ Error: Frontend build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend built successfully${NC}"

# Install backend dependencies
echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
cd backend
npm install --production
cd ..

echo -e "${GREEN}✅ Dependencies installed${NC}"

# Run database setup
echo -e "${YELLOW}🗄️  Setting up database...${NC}"
read -p "Do you want to run database setup? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    node scripts/production-setup.js
fi

# Start/restart PM2
echo -e "${YELLOW}🔄 Starting application with PM2...${NC}"
if pm2 list | grep -q "license-admin"; then
    echo "Restarting existing PM2 process..."
    pm2 restart license-admin --update-env
else
    echo "Starting new PM2 process..."
    pm2 start ecosystem.config.js --env production
    pm2 save
fi

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "📝 Next steps:"
echo "   1. Check application status: pm2 status"
echo "   2. View logs: pm2 logs license-admin"
echo "   3. Test URL: https://license.zentryasolutions.com"
echo "   4. Change default admin password!"



