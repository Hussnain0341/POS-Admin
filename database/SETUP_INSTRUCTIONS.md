# Complete Database Setup - pgAdmin Instructions

## 🎯 Quick Setup (5 Minutes)

### Step 1: Open pgAdmin

1. Open pgAdmin (usually in Start Menu)
2. Connect to your PostgreSQL server
3. Enter your password when prompted

### Step 2: Create Database (if needed)

**Option A: Using SQL Script (Recommended)**
1. Right-click on "Databases" → "Query Tool"
2. Open file: `database/01_CREATE_DATABASE.sql`
3. Click "Execute" (F5)
4. Database will be created automatically

**Option B: Manual Creation**
1. Right-click on "Databases"
2. Select "Create" → "Database"
3. Name: `hisaabkitab_license`
4. Click "Save"

**OR** if database already exists, skip to Step 3.

### Step 3: Run the Complete Setup Script

1. **Right-click on the database** `hisaabkitab_license`
2. Select **"Query Tool"**
3. **Open the file:** `database/02_COMPLETE_SETUP.sql`
   - Click "Open File" button (folder icon) in Query Tool
   - Navigate to `database/02_COMPLETE_SETUP.sql`
   - Click "Open"
4. **Click "Execute"** (or press F5)

### Step 4: Check Results

After execution, you should see in the "Messages" tab:

```
✅ All 4 tables created successfully!
✅ Indexes created successfully!
✅ Default admin user created successfully!
========================================
DATABASE SETUP COMPLETE! ✅
========================================
```

### Step 5: Verify Setup

Run this query in Query Tool to verify:

```sql
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check admin user
SELECT username, role FROM AdminUsers;
```

You should see:
- 4 tables: `adminusers`, `activations`, `auditlogs`, `licenses`
- Admin user: `admin` with role `superadmin`

## ✅ Done!

Your database is completely set up! 

**Next Steps:**
1. Update your `.env` file with database credentials
2. Test connection: `npm run test-db`
3. Start backend: `npm run server`

## 🔧 What the Script Does

The `COMPLETE_SETUP.sql` script automatically:

1. ✅ Enables UUID extension
2. ✅ Creates all 4 tables (AdminUsers, Licenses, Activations, AuditLogs)
3. ✅ Creates all indexes for performance
4. ✅ Creates functions (auto-update timestamps, expiry checks)
5. ✅ Creates triggers (auto-update on row changes)
6. ✅ Inserts default admin user (admin/admin123)
7. ✅ Grants proper permissions
8. ✅ Verifies everything was created correctly
9. ✅ Displays setup summary

## 🛠️ Troubleshooting

### Error: "database does not exist"
**Solution:** Create the database first (Step 2)

### Error: "permission denied"
**Solution:** Make sure you're connected as a user with CREATE privileges (usually `postgres`)

### Error: "relation already exists"
**Solution:** This is fine! The script uses `IF NOT EXISTS`, so it won't recreate existing tables.

### No messages shown
**Solution:** Check the "Messages" tab at the bottom of Query Tool, not the "Data Output" tab.

## 📝 Manual Alternative

If you prefer to run commands manually, you can also:

1. Connect to database in Query Tool
2. Copy and paste sections from `COMPLETE_SETUP.sql` one by one
3. Execute each section

But running the complete script is much easier! 😊

