# 🚀 Database Setup - Start Here!

Follow these steps in order. Each step has a ✅ checkmark when complete.

## Step 1: Check PostgreSQL is Installed ✅

Open PowerShell or Command Prompt and run:
```bash
psql --version
```

**If you see a version number:** ✅ PostgreSQL is installed! Go to Step 2.

**If you get an error:** 
- Download PostgreSQL: https://www.postgresql.org/download/windows/
- Install it (remember the password you set!)
- Then come back to Step 1

---

## Step 2: Check PostgreSQL is Running ✅

1. Press `Win + R`
2. Type: `services.msc` and press Enter
3. Look for "postgresql" service
4. If it says "Running" → ✅ Go to Step 3
5. If it says "Stopped" → Right-click → Start → ✅ Go to Step 3

---

## Step 3: Create the Database ✅

Open PowerShell and run:
```bash
psql -U postgres
```

You'll be asked for password (the one you set during installation).

Then type these commands one by one:
```sql
CREATE DATABASE hisaabkitab_license;
\q
```

**Expected output:** `CREATE DATABASE` ✅

---

## Step 4: Update Your .env File ✅

Open your `.env` file in the root directory and make sure it has:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hisaabkitab_license
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD_HERE
DB_SSL=false
```

**Important:** Replace `YOUR_POSTGRES_PASSWORD_HERE` with your actual PostgreSQL password!

---

## Step 5: Initialize Database Schema ✅

In PowerShell (in your project folder), run:
```bash
npm run init-db
```

**Expected output:**
```
Initializing database...
Database initialized successfully!

Default admin credentials:
Username: admin
Password: admin123
```

✅ If you see this, database is set up!

---

## Step 6: Test Database Connection ✅

Run this command:
```bash
npm run test-db
```

**Expected output:**
```
🔍 Testing Database Connection...
✅ Connection successful!
✅ All tests passed! Database is ready to use.
```

✅ If you see this, everything works!

---

## Step 7: Test Backend Server ✅

Start the server:
```bash
npm run server
```

**Expected output:**
```
Database connected successfully
Server running on port 3001
```

✅ If you see this, backend is working!

Press `Ctrl+C` to stop the server.

---

## Step 8: Test Admin Login ✅

Keep the server running (from Step 7), open a NEW PowerShell window, and run:

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/admin/login" -Method POST -ContentType "application/json" -Body '{"username":"admin","password":"admin123"}'
```

**Expected output:** A JSON object with a `token` field.

✅ If you see a token, login works!

---

## 🎉 You're Done!

Your database is set up and working! 

**Next Steps:**
1. Start backend: `npm run server`
2. Start frontend: `npm run client` (in another terminal)
3. Open browser: http://localhost:3000
4. Login with: `admin` / `admin123`

---

## ❌ Having Problems?

### Problem: "psql: command not found"
**Solution:** PostgreSQL is not installed or not in PATH. Install PostgreSQL.

### Problem: "password authentication failed"
**Solution:** Check your `DB_PASSWORD` in `.env` matches your PostgreSQL password.

### Problem: "database does not exist"
**Solution:** Run Step 3 again to create the database.

### Problem: "connection refused"
**Solution:** 
1. Check PostgreSQL service is running (Step 2)
2. Verify port 5432 is not blocked

### Problem: "module 'pg' not found"
**Solution:** Run `npm install` in the project root.

---

## 📚 Need More Help?

- See [DATABASE_SETUP_GUIDE.md](./DATABASE_SETUP_GUIDE.md) for detailed instructions
- See [QUICK_DATABASE_SETUP.md](./QUICK_DATABASE_SETUP.md) for quick reference


