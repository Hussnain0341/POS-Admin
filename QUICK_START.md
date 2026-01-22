# Quick Start Guide

## Prerequisites

- Node.js v14+ installed
- PostgreSQL v12+ installed and running
- npm or yarn

## Setup Steps

### 1. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Configure Database

1. Create a PostgreSQL database:
   ```sql
   CREATE DATABASE hisaabkitab_license;
   ```

2. Update `.env` file (copy from `.env.example`):
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=hisaabkitab_license
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_SSL=false
   JWT_SECRET=your-secret-key-change-this
   ```

3. Initialize database:
   ```bash
   node scripts/init-db.js
   ```

   Or manually run:
   ```bash
   psql -U postgres -d hisaabkitab_license -f database/schema.sql
   ```

### 3. Configure Frontend

Create `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:3001/api
```

### 4. Start Development Server

```bash
# Start both backend and frontend
npm run dev

# Or start separately:
# Backend only:
npm run server

# Frontend only (in another terminal):
cd client && npm start
```

### 5. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Default login:
  - Username: `admin`
  - Password: `admin123`

**⚠️ IMPORTANT: Change the default password in production!**

## Change Admin Password

```bash
node scripts/setup-admin.js admin newpassword
```

Then update the database with the generated hash.

## Create Your First License

1. Login to the admin panel
2. Click "Create License"
3. Fill in the form:
   - Tenant Name: Your shop name
   - Max Devices: Number of devices allowed
   - Max Users: Number of users allowed
   - Expiry Date: License expiration date
   - Features: JSON object with feature flags
4. Click "Create"

## Test POS Integration

Use the `/api/license/validate` endpoint:

```bash
curl -X POST http://localhost:5000/api/license/validate \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "HK-XXXX-XXXX-XXXX",
    "deviceId": "test-device-123",
    "appVersion": "1.0.0"
  }'
```

## Troubleshooting

### Database Connection Error
- Verify PostgreSQL is running
- Check credentials in `.env`
- Ensure database exists

### Port Already in Use
- Change `PORT` in `.env` (backend)
- Change port in `frontend/package.json` scripts (frontend)

### Module Not Found
- Run `npm install` in both root and `frontend` directories

## Next Steps

- Read [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for API details
- Read [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
- Review [README.md](./README.md) for project overview

