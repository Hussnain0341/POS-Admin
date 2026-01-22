# Deployment Guide - HisaabKitab License Admin System

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- Hostinger account (or your hosting provider)

## Step 1: Database Setup

1. Create a PostgreSQL database on your hosting provider
2. Note down the database credentials:
   - Host
   - Port
   - Database name
   - Username
   - Password
   - SSL requirement

## Step 2: Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your database credentials:
   ```env
   PORT=5000
   NODE_ENV=production
   DB_HOST=your-db-host
   DB_PORT=5432
   DB_NAME=your-db-name
   DB_USER=your-db-user
   DB_PASSWORD=your-db-password
   DB_SSL=true
   JWT_SECRET=your-super-secret-jwt-key-change-this
   CORS_ORIGIN=https://your-domain.com
   ```

3. For the frontend, create `frontend/.env`:
   ```env
   REACT_APP_API_URL=https://your-api-domain.com/api
   ```

## Step 3: Database Initialization

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the database initialization script:
   ```bash
   node scripts/init-db.js
   ```

   Or manually run the SQL file:
   ```bash
   psql -h your-host -U your-user -d your-database -f database/schema.sql
   ```

3. Change the default admin password:
   ```bash
   node scripts/setup-admin.js admin your-new-password
   ```

## Step 4: Build Frontend

```bash
cd client
npm install
npm run build
```

This creates a `build` folder with production-ready files.

## Step 5: Backend Deployment

### Option A: Using PM2 (Recommended)

1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```

2. Start the server:
   ```bash
   pm2 start server/index.js --name license-admin
   ```

3. Save PM2 configuration:
   ```bash
   pm2 save
   pm2 startup
   ```

### Option B: Using Node.js directly

```bash
NODE_ENV=production node server/index.js
```

## Step 6: Reverse Proxy Setup (Nginx)

Create an Nginx configuration file:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    # API Backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend
    location / {
        root /path/to/frontend/build;
        try_files $uri $uri/ /index.html;
    }
}
```

## Step 7: SSL Certificate

1. Use Let's Encrypt (free SSL):
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

2. Or use your hosting provider's SSL certificate

## Step 8: Security Checklist

- [ ] Changed default admin password
- [ ] Set strong JWT_SECRET
- [ ] Enabled HTTPS
- [ ] Database uses SSL connection
- [ ] CORS_ORIGIN is set to your domain only
- [ ] Firewall rules configured
- [ ] Regular backups configured

## Step 9: POS Integration

Configure POS to use your license server:

```javascript
const LICENSE_SERVER_URL = 'https://your-api-domain.com/api/license';
```

## Monitoring

1. Check server logs:
   ```bash
   pm2 logs license-admin
   ```

2. Monitor database connections
3. Set up error alerting
4. Regular backups

## Troubleshooting

### Database Connection Issues
- Verify credentials in `.env`
- Check firewall rules
- Ensure SSL is configured correctly

### API Not Responding
- Check if server is running: `pm2 list`
- Check server logs: `pm2 logs`
- Verify port is not blocked

### Frontend Not Loading
- Verify `REACT_APP_API_URL` in `client/.env`
- Check browser console for errors
- Ensure API is accessible

## Backup Strategy

1. Database backups (daily):
   ```bash
   pg_dump -h host -U user -d database > backup.sql
   ```

2. Code backups (Git repository)

3. Environment file backups (secure storage)

## Updates

1. Pull latest code
2. Run `npm install`
3. Rebuild frontend: `cd client && npm run build`
4. Restart server: `pm2 restart license-admin`

