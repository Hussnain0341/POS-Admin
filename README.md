# HisaabKitab License Admin System

Web-based license management system for HisaabKitab POS software.

## Features

- **License Management**: Create, edit, revoke, and track licenses
- **Device Activation Tracking**: Monitor device activations per license
- **Feature Flags**: Control POS features per license
- **Admin Dashboard**: Comprehensive dashboard with statistics
- **Audit Logging**: Track all license operations
- **Secure API**: JWT authentication and bcrypt password hashing

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Frontend**: React.js + TypeScript + Tailwind CSS
- **Authentication**: JWT + bcrypt

## Project Structure

```
POS Admin Pannel/
├── backend/          # Node.js + Express backend
│   ├── config/      # Configuration files
│   ├── middleware/  # Express middleware
│   ├── routes/      # API routes
│   └── utils/       # Utility functions
├── frontend/        # React + TypeScript frontend
│   ├── public/      # Static assets
│   └── src/         # Source code
├── database/        # Database schema and migrations
├── assets/          # Static assets
├── scripts/         # Utility scripts
└── ecosystem.config.js  # PM2 configuration
```

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Install root dependencies:**
   ```bash
   npm install
   ```

2. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   cd ..
   ```

3. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Set up database:**
   - Create PostgreSQL database: `hisaabkitab_license` (or `license_admin`)
   - Run the SQL schema: `database/02_COMPLETE_SETUP.sql`
   - Run 2FA table: `database/03_2FA_TABLE.sql` (required for login)
   - Default admin: `admin` / `admin123`

5. **Configure environment:**
   - In `backend/.env` set database, JWT, and **SMTP + 2FA** (see `backend/ENV_2FA_SMTP.txt`)
   - **2FA**: Login requires a 6-digit code sent to `TWO_FA_EMAIL` (default: hussnain0341@gmail.com). Configure SMTP (e.g. Gmail with [App Password](https://myaccount.google.com/apppasswords)).
   ```
   PORT=3001
   NODE_ENV=development
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_NAME=hisaabkitab_license
   JWT_SECRET=your_jwt_secret_here
   CORS_ORIGIN=http://localhost:3000
   TWO_FA_EMAIL=hussnain0341@gmail.com
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   SMTP_FROM=your_email@gmail.com
   ```

6. **Run the application:**
   ```bash
   # Development mode (runs both backend and frontend)
   npm run dev
   
   # Or run separately:
   npm run server    # Backend on port 3001
   npm run client    # Frontend on port 3000
   ```

7. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Login: `admin` / `admin123` → then enter the 6-digit code sent to `TWO_FA_EMAIL`

## API Endpoints

### Admin Endpoints (Require Authentication)

- `POST /api/admin/login` - Admin login (returns `require2FA` + `tempToken`; then call verify-2fa)
- `POST /api/admin/verify-2fa` - Complete login with 6-digit code (`tempToken`, `code`)
- `GET /api/admin/licenses` - Get all licenses
- `GET /api/admin/licenses/:id` - Get single license
- `POST /api/admin/licenses` - Create license
- `PUT /api/admin/licenses/:id` - Update license
- `POST /api/admin/licenses/:id/revoke` - Revoke license
- `GET /api/admin/dashboard/stats` - Get dashboard statistics

### POS Integration Endpoints

- `POST /api/license/validate` - Validate license (activation check)
- `GET /api/license/status` - Periodic status check

## Deployment

### GitHub Deployment

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **On VPS:**
   ```bash
   cd /var/www/license-admin
   git pull origin main
   pm2 restart license-admin
   ```

### Production Setup

See `scripts/deploy-vps-from-github.sh` for automated deployment script.

## Security Notes

- Change default admin password in production
- Use strong JWT secret in production
- Enable HTTPS in production
- Device IDs are hashed before storage

## License

Proprietary - HisaabKitab

