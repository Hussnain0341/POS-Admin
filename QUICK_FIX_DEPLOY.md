# 🔧 Quick Fix - Directory Doesn't Exist

The error shows that `/var/www/license-admin` doesn't exist on the VPS yet.

## Step 1: Create Directory on VPS

Run these commands on your VPS (you're already SSH'd in):

```bash
mkdir -p /var/www/license-admin
cd /var/www/license-admin
pwd
```

## Step 2: Upload Files

You have two options:

### Option A: Upload from Your Local Machine (Recommended)

**From your Windows machine**, open a new PowerShell or Git Bash window and run:

```bash
cd "E:\POS\POS Admin Pannel"
scp -r deploy-package/* root@147.79.117.39:/var/www/license-admin/
```

When prompted, enter password: `Hussn@in0341`

### Option B: Use WinSCP/FileZilla

1. Connect to `147.79.117.39` with WinSCP/FileZilla
2. Navigate to `/var/www/license-admin/`
3. Upload all files from `deploy-package` folder

## Step 3: Verify Files Are Uploaded

Back on your VPS SSH session, run:

```bash
cd /var/www/license-admin
ls -la
```

You should see:
- `backend/` folder
- `frontend/` folder
- `database/` folder
- `scripts/` folder
- `deploy-on-vps.sh` file
- `ecosystem.config.js` file
- `package.json` file

## Step 4: Run Deployment Script

Once files are uploaded:

```bash
chmod +x deploy-on-vps.sh
./deploy-on-vps.sh
```

---

**Quick One-Liner to Create Directory and Check:**

```bash
mkdir -p /var/www/license-admin && cd /var/www/license-admin && ls -la
```

