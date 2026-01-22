# Local Development Setup

## Quick Fix for Local Run

### Issue 1: Database Authentication
The error shows "postgress" (typo) - make sure your `.env` has:
```
DB_USER=postgres
```

### Issue 2: Port 3000 Already in Use
Something is already running on port 3000. Options:

**Option A: Kill the process on port 3000**
```powershell
# Find the process
netstat -ano | findstr :3000

# Kill it (replace PID with the number from above)
taskkill /PID <PID> /F
```

**Option B: Use different port for frontend**
Edit `frontend/package.json` and change the start script to use port 3001:
```json
"start": "PORT=3001 react-scripts start"
```

### Complete .env Setup

Your `backend/.env` should have:
```
PORT=3001
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here
DB_NAME=license_admin

JWT_SECRET=local_dev_secret_change_in_production
CORS_ORIGIN=http://localhost:3000
```

### To Run

1. **Update DB_PASSWORD** in `backend/.env`
2. **Kill process on port 3000** or use different port
3. **Run:** `npm run dev`

### If You Don't Have PostgreSQL Locally

You can still test the frontend:
```bash
cd frontend
npm start
```

The frontend will run but API calls will fail without the backend/database.


