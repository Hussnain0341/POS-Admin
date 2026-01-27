# 🔗 Git Pull Commands for VPS

## 📋 Full GitHub Repository URL

**HTTPS URL:**
```
https://github.com/Hussnain0341/POS-Admin.git
```

**SSH URL (if you have SSH keys set up):**
```
git@github.com:Hussnain0341/POS-Admin.git
```

---

## 🚀 Commands to Use on VPS

### **Option 1: Using HTTPS (Requires Username/Password or Token)**

```bash
# If repository already exists, update remote URL
cd /var/www/license-admin
git remote set-url origin https://github.com/Hussnain0341/POS-Admin.git
git pull origin main
```

**Or use full URL directly:**
```bash
cd /var/www/license-admin
git pull https://github.com/Hussnain0341/POS-Admin.git main
```

---

### **Option 2: Using Personal Access Token (Recommended)**

**1. Create a Personal Access Token on GitHub:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scopes: `repo` (full control)
   - Copy the token

**2. Use token in URL:**
```bash
cd /var/www/license-admin
git pull https://YOUR_TOKEN@github.com/Hussnain0341/POS-Admin.git main
```

**Or set remote URL with token:**
```bash
cd /var/www/license-admin
git remote set-url origin https://YOUR_TOKEN@github.com/Hussnain0341/POS-Admin.git
git pull origin main
```

---

### **Option 3: Using SSH (If SSH keys are configured)**

```bash
cd /var/www/license-admin
git remote set-url origin git@github.com:Hussnain0341/POS-Admin.git
git pull origin main
```

---

## 🔄 Complete Update Command (One-Line)

**Using HTTPS:**
```bash
cd /var/www/license-admin && git pull https://github.com/Hussnain0341/POS-Admin.git main && cd backend && npm install && cd ../frontend && npm install && npm run build && cd .. && pm2 restart license-admin
```

**Using SSH:**
```bash
cd /var/www/license-admin && git pull git@github.com:Hussnain0341/POS-Admin.git main && cd backend && npm install && cd ../frontend && npm install && npm run build && cd .. && pm2 restart license-admin
```

---

## 🔧 Configure Git Credentials (One-Time Setup)

### **For HTTPS (Store credentials):**

```bash
# Configure git to store credentials
git config --global credential.helper store

# Then pull (will ask for username/password once)
git pull https://github.com/Hussnain0341/POS-Admin.git main
# Enter: Username: Hussnain0341
# Enter: Password: YOUR_GITHUB_TOKEN (not password, use Personal Access Token)
```

### **For SSH (Set up SSH keys):**

```bash
# Generate SSH key (if not exists)
ssh-keygen -t ed25519 -C "your-email@example.com"

# Copy public key
cat ~/.ssh/id_ed25519.pub

# Add this key to GitHub: https://github.com/settings/keys
# Then use SSH URL
git remote set-url origin git@github.com:Hussnain0341/POS-Admin.git
```

---

## ✅ Quick Fix for Current Issue

**If you're stuck at username prompt, press Ctrl+C and run:**

```bash
# Set remote URL with full HTTPS path
cd /var/www/license-admin
git remote set-url origin https://github.com/Hussnain0341/POS-Admin.git

# Pull with full URL
git pull https://github.com/Hussnain0341/POS-Admin.git main
```

**When prompted:**
- **Username:** `Hussnain0341`
- **Password:** Use a GitHub Personal Access Token (not your GitHub password)

---

## 🔑 Create Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name: "VPS Deployment"
4. Select scope: `repo` (check the box)
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again)
7. Use this token as password when pulling

---

## 📝 Recommended: Use Token in URL

```bash
# Replace YOUR_TOKEN with your actual token
cd /var/www/license-admin
git remote set-url origin https://YOUR_TOKEN@github.com/Hussnain0341/POS-Admin.git
git pull origin main
```

This way, you won't be prompted for credentials every time.

---

**Repository:** https://github.com/Hussnain0341/POS-Admin  
**Full HTTPS URL:** `https://github.com/Hussnain0341/POS-Admin.git`  
**Full SSH URL:** `git@github.com:Hussnain0341/POS-Admin.git`


