require('dotenv').config();
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
    ? ['https://license.zentryasolutions.com', 'https://www.license.zentryasolutions.com']
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
  max: 5, // limit each IP to 5 login requests per windowMs
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
});

app.use('/api/', limiter);
app.use('/api/admin/login', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// API Routes
app.use('/api/admin', require('./routes/admin'));
app.use('/api/license', require('./routes/license'));

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    res.status(503).json({ 
      status: 'error', 
      message: 'Database connection failed',
      timestamp: new Date().toISOString() 
    });
  }
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
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  logStream.end();
  errorLogStream.end();
  await pool.end();
  console.log('Database pool closed');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  logStream.end();
  errorLogStream.end();
  await pool.end();
  console.log('Database pool closed');
  process.exit(0);
});

const PORT = process.env.PORT || 3001;

// Initialize database and start server
(async () => {
  try {
    await pool.query('SELECT 1');
    console.log('Database connected successfully');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      if (process.env.NODE_ENV === 'production') {
        console.log(`Production URL: https://license.zentryasolutions.com`);
      }
    });
  } catch (err) {
    console.error('Database connection error:', err);
    errorLogStream.write(`${new Date().toISOString()} - Database connection failed: ${err.message}\n`);
    process.exit(1);
  }
})();

module.exports = app;
