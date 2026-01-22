# Quick Database Setup - 5 Minutes

## 🚀 Fast Setup (If PostgreSQL is Already Installed)

### Step 1: Create Database
```bash
psql -U postgres
```
Then in psql:
```sql
CREATE DATABASE hisaabkitab_license;
\q
```

### Step 2: Update .env
Make sure `.env` has:
```env
DB_PASSWORD=your_postgres_password
```

### Step 3: Initialize Schema
```bash
npm run init-db
```

### Step 4: Test Connection
```bash
npm run test-db
```

### Step 5: Start Server
```bash
npm run server
```

**Done!** ✅

---

## 📝 Detailed Steps (If You Need Help)

See [DATABASE_SETUP_GUIDE.md](./DATABASE_SETUP_GUIDE.md) for complete step-by-step instructions.


