# Backend Folder

This folder contains the Node.js + Express backend server.

## Structure

```
backend/
├── config/          # Configuration files
│   └── database.js  # PostgreSQL connection pool
├── middleware/      # Express middleware
│   ├── auth.js      # JWT authentication
│   └── audit.js     # Audit logging
├── routes/          # API route handlers
│   ├── admin.js     # Admin endpoints
│   └── license.js   # POS license validation endpoints
├── utils/           # Utility functions
│   └── licenseKey.js # License key generation
└── index.js         # Main server entry point
```

## API Endpoints

### Admin Endpoints (Authenticated)
- `POST /api/admin/login` - Admin login
- `GET /api/admin/licenses` - List licenses
- `POST /api/admin/licenses` - Create license
- `PUT /api/admin/licenses/:id` - Update license
- `POST /api/admin/licenses/:id/revoke` - Revoke license
- `GET /api/admin/dashboard/stats` - Dashboard statistics

### POS Endpoints (Public)
- `POST /api/license/validate` - Validate license
- `GET /api/license/status` - Check license status

## Environment Variables

Required in `.env`:
- `DB_HOST` - Database host
- `DB_PORT` - Database port
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `JWT_SECRET` - JWT secret key
- `PORT` - Server port (default: 5000)

## Running

```bash
# Development
npm run server

# Production
node backend/index.js
```


