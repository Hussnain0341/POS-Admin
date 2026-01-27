// Load environment variables from backend/.env
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const path = require('path');
const fs = require('fs');
const { pool } = require('./config/database');

const app = express();

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Production logging
const logStream = fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' });
const errorLogStream = fs.createWriteStream(path.join(logsDir, 'error.log'), { flags: 'a' });

// Middleware
// CORS configuration
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://api.zentryasolutions.com',
        'https://www.api.zentryasolutions.com',
        'https://license.zentryasolutions.com',
        'https://www.license.zentryasolutions.com'
      ]
    : '*',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // More lenient in development
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
app.use('/api/admin/login', authLimiter);
app.use('/api/admin/verify-2fa', authLimiter);

// Body parsing (increased for large file uploads)
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const logEntry = `${new Date().toISOString()} - ${req.method} ${req.url} - IP: ${req.ip}\n`;
  logStream.write(logEntry);
  next();
});

// HTTPS enforcement in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Static file serving for POS updates (must be before API routes)
const UPDATES_BASE_DIR = process.env.UPDATES_BASE_DIR || 
  (process.env.NODE_ENV === 'production' 
    ? '/var/www/updates/hisaabkitab'
    : path.join(__dirname, '../uploads/pos-updates'));

// Ensure directory exists
if (!fs.existsSync(UPDATES_BASE_DIR)) {
  fs.mkdirSync(UPDATES_BASE_DIR, { recursive: true });
  fs.mkdirSync(path.join(UPDATES_BASE_DIR, 'windows'), { recursive: true });
  console.log(`Created updates directory: ${UPDATES_BASE_DIR}`);
}

// Log the base directory being used
console.log(`POS Updates base directory: ${UPDATES_BASE_DIR}`);
console.log(`POS Updates directory exists: ${fs.existsSync(UPDATES_BASE_DIR)}`);

// Custom static file handler with better error handling and logging
app.use('/pos-updates/files', (req, res, next) => {
  // Decode URL to handle spaces and special characters
  const decodedPath = decodeURIComponent(req.path);
  const filePath = path.join(UPDATES_BASE_DIR, decodedPath.replace('/pos-updates/files/', ''));
  
  // Log the request for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`File request: ${req.path}`);
    console.log(`Decoded path: ${decodedPath}`);
    console.log(`Resolved file path: ${filePath}`);
    console.log(`File exists: ${fs.existsSync(filePath)}`);
  }
  
  // Check if file exists
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    res.setHeader('Content-Type', 'application/x-msdownload');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (err) => {
      console.error(`Error streaming file ${filePath}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading file' });
      }
    });
  } else {
    // File not found - log for debugging
    console.error(`File not found: ${filePath}`);
    console.error(`Requested path: ${req.path}`);
    console.error(`Base directory: ${UPDATES_BASE_DIR}`);
    
    // Try to list directory contents for debugging
    const dirPath = path.dirname(filePath);
    if (fs.existsSync(dirPath)) {
      try {
        const files = fs.readdirSync(dirPath);
        console.error(`Files in directory ${dirPath}:`, files);
      } catch (err) {
        console.error(`Error listing directory:`, err);
      }
    }
    
    res.status(404).json({ 
      error: 'File not found',
      requestedPath: req.path,
      resolvedPath: filePath,
      baseDirectory: UPDATES_BASE_DIR
    });
  }
});

// API Routes
app.use('/api/admin', require('./routes/admin'));
app.use('/api/license', require('./routes/license'));

// POS Updates Routes
// Public route (for POS app) - no /api prefix
app.use('/pos-updates', require('./routes/pos-updates'));
// Admin routes (for admin panel) - with /api prefix
app.use('/api/pos-updates', require('./routes/pos-updates'));

// Health check
app.get('/health', (req, res) => {
  pool.query('SELECT NOW()', (err) => {
    if (err) {
      return res.status(503).json({ 
        status: 'error', 
        message: 'Database connection failed',
        timestamp: new Date().toISOString() 
      });
    }
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });
});

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../frontend/build');
  
  // Check if build directory exists
  if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
    
    // Serve React app for all non-API routes
    app.get('*', (req, res) => {
      // Don't serve index.html for API routes
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      res.sendFile(path.join(buildPath, 'index.html'));
    });
  } else {
    console.warn('WARNING: Frontend build directory not found. API will work but frontend will not be served.');
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api/')) {
        return res.status(503).json({ 
          error: 'Frontend not built. Please run npm run build in frontend directory.' 
        });
      }
    });
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  const errorEntry = `${new Date().toISOString()} - ERROR: ${err.message}\nStack: ${err.stack}\n\n`;
  errorLogStream.write(errorEntry);
  
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  logStream.end();
  errorLogStream.end();
  pool.end()
    .then(() => {
      console.log('Database pool closed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error closing database pool:', err);
      process.exit(1);
    });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  logStream.end();
  errorLogStream.end();
  pool.end()
    .then(() => {
      console.log('Database pool closed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error closing database pool:', err);
      process.exit(1);
    });
});

const PORT = process.env.PORT || 3001;

// Initialize database and start server
pool.query('SELECT NOW()')
  .then(() => {
    console.log('Database connected successfully');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      if (process.env.NODE_ENV === 'production') {
        console.log(`Production URL: https://license.zentryasolutions.com`);
      }
    });
  })
  .catch((err) => {
    console.error('Database connection error:', err);
    errorLogStream.write(`${new Date().toISOString()} - Database connection failed: ${err.message}\n`);
    process.exit(1);
  });

module.exports = app;
