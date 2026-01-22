# Environment Variables Setup Guide

## 📋 Complete .env File Configuration

### Backend .env File (Root Directory)

Create or update `.env` in the root directory with the following content:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hisaabkitab_license
DB_USER=postgres
DB_PASSWORD=your_database_password_here

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this

# CORS
CORS_ORIGIN=http://localhost:3000
DB_SSL=false
```

### Frontend .env File

Create `frontend/.env` with:

```env
REACT_APP_API_URL=http://localhost:3001/api
```

## 🔧 Configuration Details

### Port Configuration

- **Backend Port: 3001** (changed from 5000 to avoid conflicts)
- **Frontend Port: 3000** (React default)
- **Database Port: 5432** (PostgreSQL default)

### Database Configuration

Update these values based on your PostgreSQL setup:

```env
DB_HOST=localhost          # Your database server address
DB_PORT=5432              # PostgreSQL port
DB_NAME=hisaabkitab_license  # Your database name
DB_USER=postgres         # Your database username
DB_PASSWORD=your_password  # Your database password
DB_SSL=false             # true for production, false for local
```

### Security Configuration

#### JWT Secret

Generate a strong JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Or use an online generator. **Never use the default secret in production!**

#### CORS Origin

- **Development:** `http://localhost:3000`
- **Production:** `https://your-domain.com`

## 📝 Step-by-Step Setup

### 1. Backend .env File

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and update:
   - `DB_PASSWORD` - Your PostgreSQL password
   - `JWT_SECRET` - Generate a strong random string
   - `DB_NAME` - Your database name (if different)
   - `DB_USER` - Your database username (if different)

### 2. Frontend .env File

1. Create `frontend/.env`:
   ```bash
   cd frontend
   echo REACT_APP_API_URL=http://localhost:3001/api > .env
   ```

2. Or manually create the file with the content above

### 3. Verify Configuration

Check that both files exist:
- ✅ Root: `.env`
- ✅ Frontend: `frontend/.env`

## 🚀 Quick Start Values

For local development, you can use these default values:

**Backend .env:**
```env
PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hisaabkitab_license
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false
JWT_SECRET=dev-secret-key-change-in-production
CORS_ORIGIN=http://localhost:3000
```

**Frontend .env:**
```env
REACT_APP_API_URL=http://localhost:3001/api
```

## ⚠️ Important Notes

1. **Never commit .env files** - They contain sensitive information
2. **Change default passwords** - Especially in production
3. **Use strong JWT secrets** - Generate random strings
4. **Enable SSL in production** - Set `DB_SSL=true`
5. **Update CORS_ORIGIN** - Match your production domain

## 🔒 Production Checklist

Before deploying to production:

- [ ] Change `DB_PASSWORD` to a strong password
- [ ] Generate a new `JWT_SECRET` (64+ characters)
- [ ] Set `NODE_ENV=production`
- [ ] Set `DB_SSL=true`
- [ ] Update `CORS_ORIGIN` to your production domain
- [ ] Update `DB_HOST` to production database host
- [ ] Update frontend `REACT_APP_API_URL` to production API URL

## 🐛 Troubleshooting

### Database Connection Error
- Check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`
- Verify PostgreSQL is running
- Check if database exists

### Port Already in Use
- Change `PORT` in `.env` to a different port (e.g., 3002)
- Update frontend `REACT_APP_API_URL` accordingly

### CORS Errors
- Verify `CORS_ORIGIN` matches your frontend URL
- Check that frontend is running on the correct port

## 📚 Related Files

- `.env.example` - Template file (safe to commit)
- `frontend/.env.example` - Frontend template
- `backend/config/database.js` - Database configuration
- `backend/index.js` - Server configuration


