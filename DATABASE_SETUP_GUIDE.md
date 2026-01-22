# Database Setup Guide - Step by Step

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ PostgreSQL installed (version 12 or higher)
- ✅ PostgreSQL service running
- ✅ Access to PostgreSQL (command line or pgAdmin)

## 🔍 Step 1: Check PostgreSQL Installation

### Windows:
1. Open Command Prompt or PowerShell
2. Check if PostgreSQL is installed:
   ```bash
   psql --version
   ```
   
   If you see a version number, PostgreSQL is installed ✅
   
   If you get an error, install PostgreSQL:
   - Download from: https://www.postgresql.org/download/windows/
   - Run the installer
   - Remember the password you set for the `postgres` user

### Verify PostgreSQL Service is Running:
1. Press `Win + R`, type `services.msc`, press Enter
2. Look for "PostgreSQL" service
3. Ensure it's "Running" (if not, right-click → Start)

## 🔍 Step 2: Access PostgreSQL

### Option A: Using Command Line (psql)

1. Open Command Prompt or PowerShell
2. Connect to PostgreSQL:
   ```bash
   psql -U postgres
   ```
   
   You'll be prompted for the password (the one you set during installation)

### Option B: Using pgAdmin (GUI)

1. Open pgAdmin (usually in Start Menu)
2. Connect to your PostgreSQL server
3. Enter your password when prompted

## 🔍 Step 3: Create the Database

### Using Command Line:

1. Connect to PostgreSQL:
   ```bash
   psql -U postgres
   ```

2. Create the database:
   ```sql
   CREATE DATABASE hisaabkitab_license;
   ```

3. Verify it was created:
   ```sql
   \l
   ```
   
   You should see `hisaabkitab_license` in the list

4. Connect to the new database:
   ```sql
   \c hisaabkitab_license
   ```

5. Exit psql:
   ```sql
   \q
   ```

### Using pgAdmin:

1. Right-click on "Databases"
2. Select "Create" → "Database"
3. Name: `hisaabkitab_license`
4. Click "Save"

## 🔍 Step 4: Update .env File

Make sure your `.env` file has the correct database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hisaabkitab_license
DB_USER=postgres
DB_PASSWORD=your_actual_password_here
DB_SSL=false
```

**Important:** Replace `your_actual_password_here` with your actual PostgreSQL password!

## 🔍 Step 5: Initialize Database Schema

You have two options:

### Option A: Using the Script (Recommended)

1. Make sure you're in the project root directory
2. Run the initialization script:
   ```bash
   node scripts/init-db.js
   ```

   You should see:
   ```
   Initializing database...
   Database initialized successfully!
   
   Default admin credentials:
   Username: admin
   Password: admin123
   ```

### Option B: Manual SQL Execution

1. Connect to your database:
   ```bash
   psql -U postgres -d hisaabkitab_license
   ```

2. Run the schema file:
   ```bash
   psql -U postgres -d hisaabkitab_license -f database/schema.sql
   ```

   Or in psql:
   ```sql
   \i database/schema.sql
   ```

## 🔍 Step 6: Verify Database Setup

### Check Tables Were Created:

1. Connect to the database:
   ```bash
   psql -U postgres -d hisaabkitab_license
   ```

2. List all tables:
   ```sql
   \dt
   ```

   You should see:
   - `adminusers`
   - `licenses`
   - `activations`
   - `auditlogs`

3. Check AdminUsers table:
   ```sql
   SELECT username, role FROM AdminUsers;
   ```

   You should see:
   ```
   username |    role
   ---------+------------
   admin    | superadmin
   ```

4. Exit:
   ```sql
   \q
   ```

## 🔍 Step 7: Test Database Connection from Node.js

1. Make sure your `.env` file is configured correctly
2. Test the connection:
   ```bash
   node -e "require('dotenv').config(); const {pool} = require('./backend/config/database'); pool.query('SELECT NOW()', (err, res) => { if(err) console.error('Error:', err.message); else { console.log('✅ Database connected successfully!'); console.log('Current time:', res.rows[0].now); } pool.end(); });"
   ```

   You should see:
   ```
   ✅ Database connected successfully!
   Current time: 2024-01-15T10:30:00.000Z
   ```

## 🔍 Step 8: Test Backend Server Connection

1. Start the backend server:
   ```bash
   npm run server
   ```

   You should see:
   ```
   Database connected successfully
   Server running on port 3001
   ```

   If you see errors, check:
   - PostgreSQL service is running
   - Database credentials in `.env` are correct
   - Database `hisaabkitab_license` exists

## 🔍 Step 9: Test Admin Login

1. Make sure backend is running (from Step 8)
2. Open a new terminal
3. Test the login endpoint:
   ```bash
   curl -X POST http://localhost:3001/api/admin/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
   ```

   Or use PowerShell:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3001/api/admin/login" -Method POST -ContentType "application/json" -Body '{"username":"admin","password":"admin123"}'
   ```

   You should receive a JSON response with a `token` field.

## 🐛 Troubleshooting

### Error: "password authentication failed"

**Solution:**
- Check your `DB_PASSWORD` in `.env` matches your PostgreSQL password
- Try resetting PostgreSQL password:
  ```sql
  ALTER USER postgres WITH PASSWORD 'newpassword';
  ```
  Then update `.env` with the new password

### Error: "database does not exist"

**Solution:**
- Create the database (see Step 3)
- Verify database name in `.env` matches

### Error: "connection refused"

**Solution:**
- Check PostgreSQL service is running
- Verify `DB_HOST` and `DB_PORT` in `.env`
- Check PostgreSQL is listening on port 5432

### Error: "relation does not exist"

**Solution:**
- Run the schema initialization (Step 5)
- Verify tables were created (Step 6)

### Error: "module 'pg' not found"

**Solution:**
- Install dependencies:
  ```bash
  npm install
  ```

## ✅ Verification Checklist

Before proceeding, verify:

- [ ] PostgreSQL is installed and running
- [ ] Database `hisaabkitab_license` exists
- [ ] `.env` file has correct database credentials
- [ ] Schema has been initialized (tables exist)
- [ ] Admin user exists (username: admin)
- [ ] Backend can connect to database
- [ ] Login endpoint works

## 🎯 Next Steps

Once database is set up:

1. **Start Backend:**
   ```bash
   npm run server
   ```

2. **Start Frontend:**
   ```bash
   npm run client
   ```

3. **Access Admin Panel:**
   - Open: http://localhost:3000
   - Login with: `admin` / `admin123`

4. **Change Default Password:**
   - Use: `node scripts/setup-admin.js admin newpassword`
   - Update database with generated hash

## 📚 Additional Resources

- PostgreSQL Documentation: https://www.postgresql.org/docs/
- pgAdmin Guide: https://www.pgadmin.org/docs/

---

**Need Help?** Check the error messages carefully - they usually indicate what's wrong!

