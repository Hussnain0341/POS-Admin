# 🚀 VPS Deployment Guide - Hostinger

## Quick Deployment Steps

### Prerequisites
- SSH access to VPS: `root@147.79.117.39`
- Password: `Hussn@in0341`
- Domain: `license.zentryasolutions.com`

### Step 1: Install Required Tools Locally

```bash
# Install sshpass (for automated SSH)
# On Windows (Git Bash or WSL):
# Download from: https://github.com/keimpx/sshpass-windows

# On Linux/Mac:
sudo apt-get install sshpass  # Ubuntu/Debian
brew install sshpass          # Mac
```

### Step 2: Run Deployment Script

```bash
chmod +x scripts/deploy-to-vps.sh
./scripts/deploy-to-vps.sh
```

### Step 3: Manual Steps (if script fails)

#### Connect to VPS
```bash
ssh root@147.79.117.39
# Password: Hussn@in0341
```

#### Install Required Packages
```bash
apt-get update
apt-get install -y nodejs npm postgresql postgresql-contrib nginx certbot python3-certbot-nginx pm2 git
```

#### Create PostgreSQL Database
```bash
sudo -u postgres psql
```

In PostgreSQL:
```sql
CREATE DATABASE license_admin;
CREATE USER license_admin WITH PASSWORD 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE license_admin TO license_admin;
\q
```

#### Upload Files
From your local machine:
```bash
# Build frontend first
cd frontend
npm install
REACT_APP_API_URL=https://license.zentryasolutions.com/api npm run build
cd ..

# Upload files using SCP
scp -r backend root@147.79.117.39:/var/www/license-admin/
scp -r frontend/build root@147.79.117.39:/var/www/license-admin/frontend/
scp -r scripts root@147.79.117.39:/var/www/license-admin/
scp ecosystem.config.js root@147.79.117.39:/var/www/license-admin/
scp package.json root@147.79.117.39:/var/www/license-admin/
```

#### Configure Environment
On VPS:
```bash
cd /var/www/license-admin/backend
nano .env
```

Add:
```env
PORT=3000
NODE_ENV=production
DB_HOST=localhost
DB_PORT=5432
DB_USER=license_admin
DB_PASSWORD=YourSecurePassword123!
DB_NAME=license_admin
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
CORS_ORIGIN=https://license.zentryasolutions.com
ADMIN_USERNAME=superadmin
ADMIN_PASSWORD=ChangeMe123!
```

#### Install Dependencies
```bash
cd /var/www/license-admin/backend
npm install --production
```

#### Setup Database
```bash
cd /var/www/license-admin
node scripts/production-setup.js
```

#### Configure Nginx
```bash
nano /etc/nginx/sites-available/license.zentryasolutions.com
```

Add:
```nginx
server {
    listen 80;
    server_name license.zentryasolutions.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name license.zentryasolutions.com;

    ssl_certificate /etc/letsencrypt/live/license.zentryasolutions.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/license.zentryasolutions.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/license.zentryasolutions.com /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

#### Setup SSL
```bash
certbot --nginx -d license.zentryasolutions.com
```

#### Start Application
```bash
cd /var/www/license-admin
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Step 4: Verify Deployment

1. Check health: `curl https://license.zentryasolutions.com/health`
2. Visit: `https://license.zentryasolutions.com`
3. Login with: `superadmin` / `ChangeMe123!`
4. **Change password immediately!**

### Troubleshooting

```bash
# Check PM2 status
pm2 status
pm2 logs license-admin

# Check Nginx
systemctl status nginx
nginx -t

# Check PostgreSQL
systemctl status postgresql
sudo -u postgres psql -d license_admin

# Check logs
tail -f /var/www/license-admin/backend/logs/error.log
```


