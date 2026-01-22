# Deployment Package

This package is ready for upload to Hostinger.

## Upload Instructions

1. **Upload ZIP to Hostinger**
   - Log in to Hostinger hPanel
   - Go to File Manager
   - Navigate to /public_html/
   - Upload: license-admin-deployment.zip
   - Right-click → Extract

2. **Create .env File**
   - After extraction, create backend/.env
   - Copy from backend/.env.example
   - Fill in your MySQL credentials

3. **Import Database**
   - Go to phpMyAdmin in hPanel
   - Create database: license_admin
   - Import: database/01_MYSQL_SETUP.sql

4. **Install Dependencies**
   - SSH or use Terminal in hPanel
   - cd /public_html/license-admin/backend
   - npm install --production

5. **Start Application**
   - pm2 start ecosystem.config.js --env production
   - pm2 save

## File Structure

```
license-admin/
├── backend/          # Backend application
├── frontend/build/   # React production build
├── database/        # MySQL schema
├── scripts/         # Setup and backup scripts
└── ecosystem.config.js  # PM2 configuration
```

## Next Steps

See DEPLOYMENT_MYSQL.md for complete instructions.
