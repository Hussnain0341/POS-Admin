# Database Setup

This folder contains **ONE complete SQL file** that sets up everything.

## 📁 Files

- **`SETUP.sql`** ⭐ **THE ONLY FILE YOU NEED**
  - Complete database setup script
  - Creates database (instructions included)
  - Creates all tables (AdminUsers, Licenses, Activations, AuditLogs, login_2fa_codes)
  - Creates all indexes, functions, triggers
  - Sets up default admin user
  - Grants permissions
  - Verifies everything

## 🚀 Quick Start

### Step 1: Create Database (if it doesn't exist)

**In pgAdmin:**
1. Right-click **"Databases"** → **"Query Tool"**
2. Run this command:
   ```sql
   CREATE DATABASE hisaabkitab_license;
   ```
3. Click **Execute** (F5)

### Step 2: Run SETUP.sql

**In pgAdmin:**
1. Right-click the **`hisaabkitab_license`** database → **"Query Tool"**
2. Open **`SETUP.sql`**
3. Copy and paste the entire file (or open it directly)
4. Click **Execute** (F5)
5. Check the **"Messages"** tab - you should see: `DATABASE SETUP COMPLETE! ✅`

**Done!** ✅

## 📋 What Gets Created

- **5 Tables:**
  - `adminusers` - Admin accounts
  - `licenses` - License records
  - `activations` - Device activations
  - `auditlogs` - System audit trail
  - `login_2fa_codes` - Two-factor authentication codes

- **15+ Indexes** for performance

- **2 Functions:**
  - Auto-update timestamps
  - Auto-expire licenses

- **2 Triggers:**
  - Auto-update `updatedAt` on row changes
  - Auto-mark licenses as expired

- **1 Default Admin User:**
  - Username: `admin`
  - Password: `admin123`
  - ⚠️ **Change this password in production!**

## ✅ Verification

After running `SETUP.sql`, check the Messages tab. You should see:

```
✅ All 5 tables created successfully!
✅ Indexes created successfully!
✅ Default admin user created successfully!
DATABASE SETUP COMPLETE! ✅
```

## 🔐 Two-Factor Authentication

The system includes 2FA. After login with username/password, a 6-digit code is sent to `TWO_FA_EMAIL` (configured in `backend/.env`).

**To enable 2FA:**
1. Configure SMTP in `backend/.env` (see `backend/ENV_2FA_SMTP.txt`)
2. Set `TWO_FA_EMAIL=hussnain0341@gmail.com` (or your email)
3. Restart the backend

## 🐛 Troubleshooting

### Error: "database does not exist"
- Run Step 1 above to create the database first

### Error: "relation already exists"
- This is OK! The script uses `CREATE TABLE IF NOT EXISTS`
- It won't overwrite existing data

### Error: "permission denied"
- Make sure you're connected as `postgres` user (or a superuser)
- Or grant permissions manually

### Tables not showing up
- Refresh pgAdmin (right-click database → Refresh)
- Check the Messages tab for errors

## 📚 Next Steps

After database setup:

1. **Configure `.env`:**
   - Update `backend/.env` with database credentials
   - Add SMTP config for 2FA (see `backend/ENV_2FA_SMTP.txt`)

2. **Start the application:**
   ```bash
   npm run dev
   ```

3. **Login:**
   - Go to http://localhost:3000
   - Username: `admin`
   - Password: `admin123`
   - Enter 6-digit code from email

## 🔄 Re-running SETUP.sql

Safe to run multiple times! It uses `IF NOT EXISTS` checks, so:
- ✅ Won't duplicate data
- ✅ Won't break existing records
- ✅ Will update admin user if needed
- ✅ Will create missing tables/indexes
