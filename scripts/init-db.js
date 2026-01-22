/**
 * Database initialization script
 * Reads and executes the SQL schema file
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../backend/config/database');

async function initDatabase() {
  try {
    const sqlFile = path.join(__dirname, '../database/schema.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log('Initializing database...');
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
        } catch (error) {
          // Ignore "already exists" errors
          if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
            console.error('Error executing statement:', error.message);
            console.error('Statement:', statement.substring(0, 100));
          }
        }
      }
    }

    console.log('Database initialized successfully!');
    console.log('\nDefault admin credentials:');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('\n⚠️  IMPORTANT: Change the default password in production!');
    console.log('Use: node scripts/setup-admin.js <username> <password>');
    
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

initDatabase();

