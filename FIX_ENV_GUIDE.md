# Fix .env File - Database Connection Issue

## 🔍 Problem

You're getting: `password authentication failed for user "admin"`

## ✅ Solution

### Issue 1: Wrong Database User

**Problem:** Your `.env` has `DB_USER=admin`, but PostgreSQL doesn't have a user named "admin" by default.

**Fix:** Change to `DB_USER=postgres` (the default PostgreSQL superuser)

### Issue 2: Wrong Password

**Problem:** You might be using the application admin password instead of PostgreSQL password.

**Important Distinction:**
- **PostgreSQL Password** (`DB_PASSWORD`): The password for the `postgres` database user (set during PostgreSQL installation)
- **Application Admin Password**: The password for logging into the admin panel (username: `admin`, password: `admin123`)

## 📝 Correct .env Configuration

Your `.env` file should have:

```env
# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hisaabkitab_license
DB_USER=postgres                    # ← Changed from 'admin' to 'postgres'
DB_PASSWORD=YOUR_POSTGRES_PASSWORD  # ← Your actual PostgreSQL password
DB_SSL=false
```

## 🔧 How to Find Your PostgreSQL Password

### Option 1: Remember Installation
- When you installed PostgreSQL, you set a password for the `postgres` user
- Use that password

### Option 2: Reset PostgreSQL Password

If you forgot the password, reset it:

1. **Open pgAdmin**
2. **Right-click on your PostgreSQL server** → **Properties**
3. **Go to "Connection" tab**
4. **Update the password** or check what's saved

### Option 3: Reset via SQL (if you have access)

If you can connect to PostgreSQL somehow:

```sql
ALTER USER postgres WITH PASSWORD 'newpassword';
```

Then update `.env` with the new password.

## ✅ Quick Fix Steps

1. **Update `.env` file:**
   ```env
   DB_USER=postgres
   DB_PASSWORD=your_actual_postgres_password
   ```

2. **Test connection:**
   ```bash
   npm run test-db
   ```

3. **If still failing:**
   - Verify PostgreSQL service is running
   - Check password is correct
   - Try connecting with pgAdmin to verify credentials

## 🎯 Summary

- ✅ `DB_USER` should be `postgres` (not `admin`)
- ✅ `DB_PASSWORD` should be your PostgreSQL installation password (not `admin123`)
- ✅ `admin` / `admin123` is for the application login, not database connection

## 🧪 Test After Fix

Run:
```bash
npm run test-db
```

You should see:
```
✅ Connection successful!
✅ All tests passed!
```


