# ✅ Production Deployment Checklist

Use this checklist to ensure all steps are completed for production deployment.

## Pre-Deployment

- [ ] Subdomain `license.zentryasolutions.com` created in hPanel
- [ ] Document root set to `/public_html/license-admin`
- [ ] SSL certificate installed and active
- [ ] PostgreSQL database created
- [ ] Database user created with proper permissions
- [ ] Database credentials saved securely

## File Upload

- [ ] Backend folder uploaded to server
- [ ] Frontend build folder uploaded
- [ ] Database scripts uploaded
- [ ] Deployment scripts uploaded
- [ ] `node_modules` NOT uploaded (will install on server)
- [ ] `.env` files NOT uploaded (create on server)

## Configuration

- [ ] `.env` file created in `backend/` with production values
- [ ] JWT secret generated and added to `.env`
- [ ] Database connection details configured
- [ ] CORS origin set to production URL
- [ ] `NODE_ENV=production` set
- [ ] Frontend `.env.production` configured with API URL

## Dependencies & Build

- [ ] Backend dependencies installed (`npm install --production`)
- [ ] Frontend dependencies installed
- [ ] Frontend built for production (`npm run build:prod`)
- [ ] Build folder exists in `frontend/build/`

## Database Setup

- [ ] Database schema executed (via `production-setup.js`)
- [ ] All tables created (adminusers, licenses, activations, auditlogs)
- [ ] Indexes created
- [ ] Initial admin user created
- [ ] Database connection tested

## Process Management

- [ ] PM2 installed globally
- [ ] Application started with PM2
- [ ] PM2 configured to auto-start on reboot
- [ ] PM2 process list saved

## Web Server

- [ ] Node.js app configured in hPanel (if available)
- [ ] OR Nginx/Apache configured with reverse proxy
- [ ] Port 3000 accessible
- [ ] HTTPS redirect working
- [ ] Static files serving correctly

## Security

- [ ] SSL certificate active
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] `.env` file permissions set to 600
- [ ] Strong admin password set
- [ ] JWT secret is strong (64+ characters)
- [ ] Database password is strong
- [ ] Rate limiting active
- [ ] CORS configured correctly

## Testing

- [ ] Health endpoint responds: `/health`
- [ ] Admin login works at root URL
- [ ] Dashboard loads correctly
- [ ] Create license functionality works
- [ ] Edit license functionality works
- [ ] Revoke license functionality works
- [ ] View activations works
- [ ] API endpoint `/api/license/validate` works
- [ ] API endpoint `/api/license/status` works
- [ ] SSL certificate valid (no browser warnings)

## Backups

- [ ] Backup script created (`backup-database.js`)
- [ ] Cron job configured for daily backups
- [ ] Backup directory created (`backups/`)
- [ ] Test backup executed successfully
- [ ] Old backup cleanup working (30 days retention)

## Monitoring

- [ ] Logs directory created (`backend/logs/`)
- [ ] Access logs writing correctly
- [ ] Error logs writing correctly
- [ ] PM2 logs accessible
- [ ] Application monitoring set up (optional)

## Documentation

- [ ] Admin credentials documented (securely)
- [ ] Database credentials documented (securely)
- [ ] API endpoints documented
- [ ] Backup procedure documented
- [ ] Troubleshooting guide reviewed

## Post-Deployment

- [ ] Default admin password changed
- [ ] First license created and tested
- [ ] POS integration tested
- [ ] All team members notified of URL
- [ ] Support documentation shared

## Final Verification

- [ ] Application accessible at `https://license.zentryasolutions.com`
- [ ] No console errors in browser
- [ ] All features functional
- [ ] API responses correct
- [ ] Performance acceptable
- [ ] Mobile responsive (if applicable)

---

## Quick Test Commands

```bash
# Health check
curl https://license.zentryasolutions.com/health

# Check PM2 status
pm2 status

# View logs
pm2 logs license-admin

# Test database connection
node scripts/test-database.js
```

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Production URL**: https://license.zentryasolutions.com


