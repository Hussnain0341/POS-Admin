# Database Setup Files

This folder contains all database-related files for the HisaabKitab License Admin System.

## 📁 Files

### Setup Scripts (Run in Order)

1. **`01_CREATE_DATABASE.sql`**
   - Creates the database `hisaabkitab_license`
   - Run this FIRST if database doesn't exist
   - Run in pgAdmin while connected to any database (usually 'postgres')

2. **`02_COMPLETE_SETUP.sql`** ⭐ **MAIN SCRIPT**
   - Complete end-to-end setup script
   - Creates all tables, indexes, functions, triggers
   - Sets up default admin user
   - Grants permissions
   - Verifies everything
   - **Run this in pgAdmin after database is created**

3. **`COMPLETE_SETUP.sql`**
   - Same as `02_COMPLETE_SETUP.sql` (alternative name)
   - Use either one

4. **`schema.sql`**
   - Original schema file (used by Node.js scripts)
   - You can use this if you prefer the Node.js setup method

### Documentation

- **`SETUP_INSTRUCTIONS.md`** - Step-by-step pgAdmin instructions
- **`README.md`** - This file

## 🚀 Quick Start

### Method 1: Using pgAdmin (Recommended)

1. Open pgAdmin
2. Run `01_CREATE_DATABASE.sql` (if database doesn't exist)
3. Run `02_COMPLETE_SETUP.sql` on the database
4. Done! ✅

### Method 2: Using Node.js Scripts

1. Create database manually or use `01_CREATE_DATABASE.sql`
2. Run: `npm run init-db`
3. Done! ✅

## 📋 What Gets Created

- **4 Tables:**
  - `AdminUsers` - Admin accounts
  - `Licenses` - License records
  - `Activations` - Device activations
  - `AuditLogs` - System audit trail

- **13+ Indexes** for performance

- **2 Functions:**
  - Auto-update timestamps
  - Auto-expire licenses

- **2 Triggers:**
  - Auto-update `updatedAt` on row changes
  - Auto-mark licenses as expired

- **1 Default Admin User:**
  - Username: `admin`
  - Password: `admin123`
  - ⚠️ Change this in production!

## 🔧 Usage

### In pgAdmin:

1. **Create Database:**
   - Right-click "Databases" → Query Tool
   - Open `01_CREATE_DATABASE.sql`
   - Execute (F5)

2. **Setup Everything:**
   - Right-click `hisaabkitab_license` database → Query Tool
   - Open `02_COMPLETE_SETUP.sql`
   - Execute (F5)

3. **Verify:**
   - Check "Messages" tab for success messages
   - Should see: "DATABASE SETUP COMPLETE! ✅"

## ✅ Verification

After running the setup script, verify with:

```sql
-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;

-- Check admin user
SELECT username, role FROM AdminUsers;
```

Expected output:
- 4 tables: `adminusers`, `activations`, `auditlogs`, `licenses`
- 1 admin user: `admin` / `superadmin`

## 🐛 Troubleshooting

See `SETUP_INSTRUCTIONS.md` for detailed troubleshooting guide.

## 📚 Related Files

- `../scripts/init-db.js` - Node.js initialization script
- `../scripts/test-database.js` - Database connection test
- `../backend/config/database.js` - Database connection config
