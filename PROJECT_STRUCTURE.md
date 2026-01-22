# Project Structure

This document explains the organization of the HisaabKitab License Admin System.

## 📁 Folder Organization

```
POS Admin Pannel/
│
├── 📂 backend/              # Backend Server (Node.js + Express)
│   ├── 📂 config/           # Configuration files
│   │   └── database.js      # PostgreSQL connection pool
│   ├── 📂 middleware/       # Express middleware
│   │   ├── auth.js          # JWT authentication
│   │   └── audit.js         # Audit logging
│   ├── 📂 routes/            # API route handlers
│   │   ├── admin.js         # Admin endpoints
│   │   └── license.js       # POS license validation
│   ├── 📂 utils/             # Utility functions
│   │   └── licenseKey.js    # License key generation
│   ├── index.js             # Main server entry point
│   └── README.md            # Backend documentation
│
├── 📂 frontend/             # Frontend Application (React + TypeScript)
│   ├── 📂 public/           # Static public assets
│   ├── 📂 src/
│   │   ├── 📂 components/   # Reusable React components
│   │   │   ├── Layout.tsx
│   │   │   ├── LicenseForm.tsx
│   │   │   └── PrivateRoute.tsx
│   │   ├── 📂 pages/        # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Licenses.tsx
│   │   │   ├── LicenseDetail.tsx
│   │   │   └── Login.tsx
│   │   ├── 📂 services/     # API service layer
│   │   │   └── api.ts
│   │   ├── App.tsx          # Main app component
│   │   └── index.tsx        # Entry point
│   ├── package.json
│   ├── tailwind.config.js
│   └── README.md            # Frontend documentation
│
├── 📂 database/             # Database Files
│   ├── schema.sql           # Complete database schema
│   └── README.md            # Database documentation
│
├── 📂 assets/               # Static Assets
│   └── README.md            # Assets documentation
│
├── 📂 scripts/               # Utility Scripts
│   ├── init-db.js           # Database initialization
│   ├── setup-admin.js       # Admin user setup
│   └── README.md            # Scripts documentation
│
├── 📄 package.json          # Root package.json
├── 📄 .env.example         # Environment variables template
├── 📄 .gitignore           # Git ignore rules
│
└── 📚 Documentation/
    ├── README.md            # Main project documentation
    ├── QUICK_START.md       # Quick setup guide
    ├── API_DOCUMENTATION.md  # API reference
    ├── DEPLOYMENT.md        # Deployment guide
    ├── PROJECT_SUMMARY.md   # Project overview
    └── PROJECT_STRUCTURE.md # This file
```

## 🎯 Purpose of Each Folder

### `backend/`
Contains the Node.js Express server that handles:
- API endpoints for admin operations
- License validation for POS
- Database interactions
- Authentication and authorization
- Audit logging

**Key Files:**
- `index.js` - Server entry point
- `config/database.js` - Database connection
- `routes/admin.js` - Admin API routes
- `routes/license.js` - POS validation routes

### `frontend/`
Contains the React TypeScript application that provides:
- Admin dashboard UI
- License management interface
- Authentication pages
- Responsive design with Tailwind CSS

**Key Files:**
- `src/App.tsx` - Main application component
- `src/pages/` - Page components
- `src/components/` - Reusable components
- `src/services/api.ts` - API client

### `database/`
Contains database schema and migration files:
- `schema.sql` - Complete database schema
- All table definitions, indexes, triggers

**Usage:**
```bash
node scripts/init-db.js
# or
psql -U user -d database -f database/schema.sql
```

### `assets/`
For static assets not part of the build:
- Documentation files
- Logos and branding
- Backup files
- Other resources

**Note:** Frontend assets go in `frontend/public/` or `frontend/src/`

### `scripts/`
Utility scripts for project management:
- `init-db.js` - Initialize database
- `setup-admin.js` - Generate admin password hash

## 🔄 Development Workflow

1. **Backend Development:**
   - Edit files in `backend/`
   - Server auto-reloads with `npm run server`

2. **Frontend Development:**
   - Edit files in `frontend/src/`
   - Hot reload with `npm run client`

3. **Database Changes:**
   - Update `database/schema.sql`
   - Run migration scripts

4. **Running Full Stack:**
   ```bash
   npm run dev  # Runs both backend and frontend
   ```

## 📦 Build Output

- **Frontend Build:** `frontend/build/` (created by `npm run build`)
- **Backend:** No build step, runs directly with Node.js

## 🔍 Finding Files

- **API Routes:** `backend/routes/`
- **React Components:** `frontend/src/components/`
- **Pages:** `frontend/src/pages/`
- **Database Schema:** `database/schema.sql`
- **Configuration:** `backend/config/`
- **Utilities:** `backend/utils/` and `scripts/`

## 🚀 Deployment Structure

When deploying:
- Backend runs from `backend/` folder
- Frontend build goes to `frontend/build/`
- Database schema in `database/schema.sql`
- Environment variables in `.env` (root)

## 📝 Adding New Features

1. **New API Endpoint:**
   - Add route in `backend/routes/`
   - Update `backend/index.js` if needed

2. **New Frontend Page:**
   - Create component in `frontend/src/pages/`
   - Add route in `frontend/src/App.tsx`

3. **New Database Table:**
   - Add to `database/schema.sql`
   - Run migration script

4. **New Utility:**
   - Add to `backend/utils/` or `scripts/`

This structure makes it easy to:
- ✅ Identify where code belongs
- ✅ Navigate the codebase
- ✅ Understand project organization
- ✅ Add new features
- ✅ Deploy to production


