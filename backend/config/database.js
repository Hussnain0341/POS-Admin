const { Pool } = require('pg');

// Create PostgreSQL connection pool
const dbPassword = process.env.DB_PASSWORD || '';
if (!dbPassword || typeof dbPassword !== 'string') {
  console.error('Database password is missing or invalid. Check your .env file.');
  process.exit(1);
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'license_admin',
  user: process.env.DB_USER || 'postgres',
  password: String(dbPassword), // Ensure it's a string
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('PostgreSQL database connection error:', err);
    process.exit(-1);
  } else {
    console.log('PostgreSQL database connected successfully');
  }
});

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = { pool };
