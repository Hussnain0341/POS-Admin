const { Pool } = require('pg');
const path = require('path');

// Load .env file explicitly
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Get and validate database password
const dbPassword = process.env.DB_PASSWORD;

// Debug: Log password status (without showing actual password)
console.log('DB_PASSWORD type:', typeof dbPassword);
console.log('DB_PASSWORD exists:', !!dbPassword);
console.log('DB_PASSWORD length:', dbPassword ? dbPassword.length : 0);

if (!dbPassword) {
  console.error('❌ Database password is missing! Check your .env file.');
  console.error('Expected: DB_PASSWORD="Hussn@in0341"');
  process.exit(1);
}

if (typeof dbPassword !== 'string') {
  console.error('❌ Database password must be a string. Current type:', typeof dbPassword);
  console.error('Value:', dbPassword);
  process.exit(1);
}

// Remove quotes if present (dotenv sometimes includes them)
const cleanPassword = dbPassword.replace(/^["']|["']$/g, '');

// Debug: Log all connection parameters
console.log('Database connection config:');
console.log('  Host:', process.env.DB_HOST || 'localhost');
console.log('  Port:', parseInt(process.env.DB_PORT) || 5432);
console.log('  Database:', process.env.DB_NAME || 'license_admin');
console.log('  User:', process.env.DB_USER || 'postgres');
console.log('  Password length:', cleanPassword ? cleanPassword.length : 0);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'license_admin',
  user: process.env.DB_USER || 'postgres',
  password: cleanPassword, // Use cleaned password
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
