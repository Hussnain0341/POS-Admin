# 🔐 Change Admin Password Guide

## Quick Change (Automated Script)

### On VPS:

```bash
# Download and run the script
curl -o change-admin-password.sh https://raw.githubusercontent.com/Hussnain0341/POS-Admin/main/change-admin-password.sh
chmod +x change-admin-password.sh
bash change-admin-password.sh
```

The script will:
1. ✅ Generate a strong password (or let you enter your own)
2. ✅ Hash it using bcrypt
3. ✅ Update database
4. ✅ Restart backend
5. ✅ Test login

---

## Manual Change

### Step 1: Generate Strong Password

**Option A: Use online generator**
- Visit: https://www.lastpass.com/features/password-generator
- Generate 16+ character password with all character types

**Option B: Generate locally**
```bash
# Generate strong password
openssl rand -base64 20 | tr -d "=+/" | cut -c1-16
```

**Option C: Use the script**
```bash
bash change-admin-password.sh
# It will generate one for you
```

### Step 2: Hash the Password

```bash
cd /var/www/license-admin/backend

# Install bcryptjs if needed
npm install bcryptjs

# Generate hash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YOUR_NEW_PASSWORD', 10, (e, h) => { console.log(h); });"
```

**Copy the hash** (it will be 60 characters starting with `$2a$10$`)

### Step 3: Update Database

```bash
export PGPASSWORD="Hussn@in0341"
psql -h localhost -U postgres -d hisaabkitab_license << EOF
UPDATE adminusers 
SET passwordhash = 'PASTE_HASH_HERE'
WHERE username = 'admin';
EOF
```

### Step 4: Restart Backend

```bash
cd /var/www/license-admin
pm2 restart license-admin
```

### Step 5: Test Login

Go to: `https://api.zentryasolutions.com/login`
- Username: `admin`
- Password: Your new password

---

## Password Requirements

- **Minimum 8 characters** (recommended: 16+)
- **Mix of:**
  - Uppercase letters (A-Z)
  - Lowercase letters (a-z)
  - Numbers (0-9)
  - Special characters (!@#$%^&*)

**Example Strong Passwords:**
- `MyStr0ng!P@ssw0rd`
- `Adm1n@2024#Secure`
- `P0s$Admin!2024`

---

## One-Line Command (With Custom Password)

```bash
# Replace YOUR_STRONG_PASSWORD with your desired password
NEW_PASS="YOUR_STRONG_PASSWORD" && \
cd /var/www/license-admin/backend && \
HASH=$(node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('$NEW_PASS', 10, (e, h) => { console.log(h); });") && \
export PGPASSWORD="Hussn@in0341" && \
psql -h localhost -U postgres -d hisaabkitab_license -c "UPDATE adminusers SET passwordhash = '$HASH' WHERE username = 'admin';" && \
cd /var/www/license-admin && \
pm2 restart license-admin && \
echo "✅ Password changed to: $NEW_PASS"
```

---

## Security Best Practices

1. **Use a password manager** (LastPass, 1Password, Bitwarden)
2. **Never reuse passwords** across different systems
3. **Change password regularly** (every 90 days)
4. **Don't share passwords** via email or chat
5. **Enable 2FA** (already enabled in your system)

---

## Troubleshooting

### Password Not Working?

1. **Check hash length:**
   ```bash
   psql -h localhost -U postgres -d hisaabkitab_license -c "SELECT LENGTH(passwordhash) FROM adminusers WHERE username = 'admin';"
   ```
   Should return: `60`

2. **Verify hash format:**
   ```bash
   psql -h localhost -U postgres -d hisaabkitab_license -c "SELECT LEFT(passwordhash, 7) FROM adminusers WHERE username = 'admin';"
   ```
   Should return: `$2a$10$`

3. **Test password verification:**
   ```bash
   cd /var/www/license-admin/backend
   node -e "const bcrypt = require('bcryptjs'); const hash = 'YOUR_HASH'; bcrypt.compare('YOUR_PASSWORD', hash, (e, r) => { console.log(r ? 'MATCH' : 'NO MATCH'); });"
   ```

### Reset to Default Password

If you need to reset to default (`admin123`):

```bash
export PGPASSWORD="Hussn@in0341"
psql -h localhost -U postgres -d hisaabkitab_license -c "UPDATE adminusers SET passwordhash = '\$2a\$10\$CbtrZHwqs6X404ibOlfPeewdk5rsMa.fiB/VNamVUEyg0zdxaIfQG' WHERE username = 'admin';"
pm2 restart license-admin
```

---

**Remember:** Always save your new password securely!

