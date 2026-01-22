# 🔧 Quick Fix for "Invalid Credentials" Error

## Run This Script on VPS

```bash
curl -o diagnose-and-fix-login.sh https://raw.githubusercontent.com/Hussnain0341/POS-Admin/main/diagnose-and-fix-login.sh
chmod +x diagnose-and-fix-login.sh
bash diagnose-and-fix-login.sh
```

## What This Script Does

1. ✅ Checks database connection
2. ✅ Verifies adminusers table exists
3. ✅ Creates admin user if missing
4. ✅ Fixes password hash (sets correct bcrypt hash)
5. ✅ Verifies hash format
6. ✅ Tests password verification
7. ✅ Checks backend .env configuration
8. ✅ Shows current admin user status
9. ✅ Restarts backend

## Manual Quick Fix

If script doesn't work, run these commands:

```bash
# 1. Connect to database
export PGPASSWORD="Hussn@in0341"
psql -h localhost -U postgres -d hisaabkitab_license

# 2. Delete and recreate admin user
DELETE FROM adminusers WHERE username = 'admin';
INSERT INTO adminusers (username, passwordhash, role)
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'superadmin');

# 3. Verify
SELECT username, role, 
       CASE WHEN passwordhash IS NOT NULL THEN 'OK' ELSE 'NULL' END as status
FROM adminusers WHERE username = 'admin';

# 4. Exit
\q

# 5. Restart backend
cd /var/www/license-admin
pm2 restart license-admin
```

## One-Line Fix

```bash
export PGPASSWORD="Hussn@in0341" && psql -h localhost -U postgres -d hisaabkitab_license -c "DELETE FROM adminusers WHERE username = 'admin'; INSERT INTO adminusers (username, passwordhash, role) VALUES ('admin', '\$2a\$10\$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'superadmin');" && cd /var/www/license-admin && pm2 restart license-admin
```

## Check Backend Logs

If still not working, check what the backend is seeing:

```bash
pm2 logs license-admin --lines 50
```

Look for:
- Database connection errors
- "Invalid credentials" messages
- Password hash errors

## Verify Database Connection

```bash
# Check if backend can connect to database
cd /var/www/license-admin/backend
node -e "require('dotenv').config(); const {pool} = require('./config/database'); pool.query('SELECT NOW()').then(() => console.log('✅ DB Connected')).catch(e => console.error('❌ DB Error:', e.message));"
```

## Common Issues

1. **Wrong database name in .env**
   - Check: `cat backend/.env | grep DB_NAME`
   - Should be: `hisaabkitab_license` or `license_admin`

2. **Password hash is NULL**
   - Run the fix script above

3. **Table doesn't exist**
   - Run: `psql -h localhost -U postgres -d hisaabkitab_license -f database/SETUP.sql`

4. **Backend not reading .env**
   - Check: `cat backend/.env`
   - Restart: `pm2 restart license-admin`

## After Fix

1. Test login: https://api.zentryasolutions.com/login
2. Username: `admin`
3. Password: `admin123`
4. Should work now!

---

**The diagnostic script will identify and fix all these issues automatically!**

