# 🔐 Fix "Invalid Credentials" Error

## Problem

You're getting "Invalid credentials" error when trying to login, even with correct username/password.

## Root Causes

1. **Admin user doesn't exist in database**
2. **Password hash is NULL or empty**
3. **Password hash is incorrectly formatted**
4. **Database connection issue**

## Quick Fix

Run this script on your VPS:

```bash
# Download and run the fix script
curl -o fix-admin-password-vps.sh https://raw.githubusercontent.com/Hussnain0341/POS-Admin/main/fix-admin-password-vps.sh
chmod +x fix-admin-password-vps.sh
bash fix-admin-password-vps.sh
```

## Manual Fix

If the script doesn't work, run these commands manually:

### Step 1: Connect to Database

```bash
export PGPASSWORD="Hussn@in0341"
psql -h localhost -U postgres -d hisaabkitab_license
```

### Step 2: Check Admin User

```sql
-- Check if admin user exists
SELECT username, role, 
       CASE 
         WHEN passwordhash IS NOT NULL THEN 'Hash exists'
         ELSE 'Hash is NULL'
       END as password_status
FROM adminusers 
WHERE username = 'admin';
```

### Step 3: Fix Admin User

If user doesn't exist or hash is NULL:

```sql
-- Delete existing admin user (if exists)
DELETE FROM adminusers WHERE username = 'admin';

-- Insert admin user with correct password hash
INSERT INTO adminusers (username, passwordhash, role)
VALUES (
    'admin',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'superadmin'
);
```

### Step 4: Verify

```sql
-- Verify the admin user
SELECT username, role, 
       LENGTH(passwordhash) as hash_length,
       LEFT(passwordhash, 20) as hash_preview
FROM adminusers 
WHERE username = 'admin';
```

You should see:
- `username`: admin
- `role`: superadmin
- `hash_length`: 60 (bcrypt hash length)
- `hash_preview`: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

### Step 5: Exit and Restart Backend

```bash
# Exit psql
\q

# Restart backend
cd /var/www/license-admin
pm2 restart license-admin
```

## One-Line Fix

```bash
export PGPASSWORD="Hussn@in0341" && psql -h localhost -U postgres -d hisaabkitab_license -c "DELETE FROM adminusers WHERE username = 'admin'; INSERT INTO adminusers (username, passwordhash, role) VALUES ('admin', '\$2a\$10\$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'superadmin');" && pm2 restart license-admin
```

## Verify It's Fixed

### Check Database

```bash
export PGPASSWORD="Hussn@in0341"
psql -h localhost -U postgres -d hisaabkitab_license -c "SELECT username, role, CASE WHEN passwordhash IS NOT NULL THEN 'OK' ELSE 'NULL' END as status FROM adminusers WHERE username = 'admin';"
```

### Test Login

1. Go to: `https://api.zentryasolutions.com/login`
2. Enter: `admin` / `admin123`
3. Should work now!

## Troubleshooting

### Still Getting "Invalid Credentials"?

1. **Check backend logs:**
   ```bash
   pm2 logs license-admin --lines 50
   ```

2. **Check if backend is using correct database:**
   ```bash
   cat /var/www/license-admin/backend/.env | grep DB_
   ```

3. **Test database connection from backend:**
   ```bash
   cd /var/www/license-admin/backend
   node -e "require('dotenv').config(); const {pool} = require('./config/database'); pool.query('SELECT NOW()').then(() => console.log('DB OK')).catch(e => console.error('DB Error:', e));"
   ```

4. **Verify password hash in database:**
   ```bash
   export PGPASSWORD="Hussn@in0341"
   psql -h localhost -U postgres -d hisaabkitab_license -c "SELECT username, passwordhash FROM adminusers WHERE username = 'admin';"
   ```

### Password Hash Format

The password hash should:
- Start with `$2a$10$` (bcrypt format)
- Be exactly 60 characters long
- Match: `$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy`

### Common Issues

1. **Hash is NULL**: Run the fix script
2. **Hash is wrong format**: Delete and recreate admin user
3. **Backend not connecting to DB**: Check `.env` file
4. **Table doesn't exist**: Run `database/SETUP.sql`

## Default Credentials

- **Username**: `admin`
- **Password**: `admin123`
- **Hash**: `$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy`

---

**After fixing, restart the backend and try logging in again!**

