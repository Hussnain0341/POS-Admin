# 🗄️ Run Database Migration on VPS

## 📋 SQL File to Execute
`database/04_POS_UPDATES.sql`

---

## ✅ Commands to Run on VPS

### **Option 1: Using psql (Recommended)**

```bash
# Navigate to project directory
cd /var/www/license-admin

# Run SQL file (replace DATABASE_NAME with your actual database name)
sudo -u postgres psql -d hisaabkitab_license -f database/04_POS_UPDATES.sql
```

**If you don't know your database name, check with:**
```bash
sudo -u postgres psql -l
```

---

### **Option 2: Direct psql Connection**

```bash
cd /var/www/license-admin
sudo -u postgres psql -d hisaabkitab_license < database/04_POS_UPDATES.sql
```

---

### **Option 3: Interactive psql Session**

```bash
# Connect to database
sudo -u postgres psql -d hisaabkitab_license

# Then inside psql, run:
\i /var/www/license-admin/database/04_POS_UPDATES.sql

# Exit psql
\q
```

---

## 🔍 Verify Tables Were Created

```bash
# Connect to database
sudo -u postgres psql -d hisaabkitab_license

# Check if tables exist
\dt pos_versions
\dt pos_update_logs

# Or list all tables
\dt

# Check table structure
\d pos_versions
\d pos_update_logs

# Exit
\q
```

---

## 📝 One-Line Command (Copy & Paste)

```bash
cd /var/www/license-admin && sudo -u postgres psql -d hisaabkitab_license -f database/04_POS_UPDATES.sql
```

---

## ⚠️ If Database Name is Different

**Find your database name:**
```bash
sudo -u postgres psql -l
```

**Then use the correct name:**
```bash
cd /var/www/license-admin
sudo -u postgres psql -d YOUR_DATABASE_NAME -f database/04_POS_UPDATES.sql
```

---

## ✅ Expected Output

You should see:
```
✅ POS Updates tables created successfully!
```

---

## 🚨 Troubleshooting

### **Error: "database does not exist"**
```bash
# List all databases
sudo -u postgres psql -l

# Use the correct database name
```

### **Error: "permission denied"**
```bash
# Make sure you're using sudo -u postgres
sudo -u postgres psql -d hisaabkitab_license -f database/04_POS_UPDATES.sql
```

### **Error: "file not found"**
```bash
# Check if file exists
ls -la /var/www/license-admin/database/04_POS_UPDATES.sql

# If not, pull latest code first
cd /var/www/license-admin && git pull origin main
```

---

## 🎯 Complete Setup (If First Time)

```bash
# 1. Navigate to project
cd /var/www/license-admin

# 2. Run migration
sudo -u postgres psql -d hisaabkitab_license -f database/04_POS_UPDATES.sql

# 3. Verify tables
sudo -u postgres psql -d hisaabkitab_license -c "\dt pos_*"
```

---

**Database:** `hisaabkitab_license` (adjust if different)  
**SQL File:** `/var/www/license-admin/database/04_POS_UPDATES.sql`


