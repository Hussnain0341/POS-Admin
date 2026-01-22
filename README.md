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
- **Frontend**: React.js + Tailwind CSS
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
│   └── schema.sql   # Complete database schema
├── assets/          # Static assets (docs, images, etc.)
├── scripts/         # Utility scripts
└── Documentation files
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```

3. Set up database:
   - Create a PostgreSQL database
   - Run the SQL schema from `database/schema.sql`

4. Configure environment:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your database credentials and JWT secret.

5. Create default admin user:
   - The SQL schema includes a default admin user
   - Username: `admin`
   - Password: `admin123` (CHANGE THIS IN PRODUCTION!)
   - To create a new admin: `node scripts/setup-admin.js <username> <password>`

6. Start the server:
   ```bash
   npm run dev
   ```

### Frontend Setup

The frontend is in the `frontend` directory. See `frontend/README.md` for setup instructions.

## API Endpoints

### Admin Endpoints (Require Authentication)

- `POST /api/admin/login` - Admin login
- `GET /api/admin/licenses` - Get all licenses
- `GET /api/admin/licenses/:id` - Get single license
- `POST /api/admin/licenses` - Create license
- `PUT /api/admin/licenses/:id` - Update license
- `POST /api/admin/licenses/:id/revoke` - Revoke license
- `GET /api/admin/dashboard/stats` - Get dashboard statistics
- `GET /api/admin/audit-logs` - Get audit logs

### POS Integration Endpoints

- `POST /api/license/validate` - Validate license (activation check)
- `GET /api/license/status` - Periodic status check

## License Key Format

Format: `HK-XXXX-XXXX-XXXX`

Example: `HK-A1B2-C3D4-E5F6`

## Security Notes

- Change default admin password in production
- Use strong JWT secret in production
- Enable HTTPS in production
- Use SSL for database connection in production
- Device IDs are hashed before storage

## Deployment

1. Set `NODE_ENV=production` in `.env`
2. Build frontend: `npm run build`
3. Configure reverse proxy (nginx) for HTTPS
4. Set up SSL certificates
5. Configure database with SSL
6. Update CORS_ORIGIN in `.env`
7. Backend runs on port 3001 (frontend on 3000)

## License

Proprietary - HisaabKitab

