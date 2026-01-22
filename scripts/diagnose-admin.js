/**
 * Comprehensive admin user diagnosis
 */

require('dotenv').config();
const { pool } = require('../backend/config/database');

async function diagnose() {
  try {
    console.log('🔍 Diagnosing Admin User Issue...\n');

    // Test 1: Check table structure
    console.log('Test 1: Checking table structure...');
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'adminusers'
      ORDER BY ordinal_position
    `);
    console.log('Columns:', structure.rows.map(r => r.column_name).join(', '));
    console.log('');

    // Test 2: Check with different case variations
    console.log('Test 2: Checking with different queries...');
    
    // Try lowercase
    const lower = await pool.query('SELECT username, passwordhash, role FROM adminusers WHERE username = $1', ['admin']);
    console.log('Lowercase query - Has hash:', !!lower.rows[0]?.passwordhash);
    
    // Try mixed case
    const mixed = await pool.query('SELECT username, "passwordHash", role FROM "AdminUsers" WHERE username = $1', ['admin']);
    console.log('Mixed case query - Has hash:', !!mixed.rows[0]?.passwordHash);
    
    // Try uppercase
    const upper = await pool.query('SELECT username, PASSWORDHASH, role FROM ADMINUSERS WHERE username = $1', ['admin']);
    console.log('Uppercase query - Has hash:', !!upper.rows[0]?.passwordhash);
    
    // Test 3: Get exact data
    console.log('\nTest 3: Raw data from database...');
    const raw = await pool.query('SELECT * FROM AdminUsers WHERE username = $1', ['admin']);
    if (raw.rows.length > 0) {
      const user = raw.rows[0];
      console.log('User object keys:', Object.keys(user));
      console.log('passwordHash value:', user.passwordHash);
      console.log('passwordHash type:', typeof user.passwordHash);
      console.log('passwordHash length:', user.passwordHash?.length || 0);
      console.log('Is null?', user.passwordHash === null);
      console.log('Is undefined?', user.passwordHash === undefined);
    }

    // Test 4: Fix if needed
    if (raw.rows.length > 0 && !raw.rows[0].passwordHash) {
      console.log('\n⚠️  Password hash is missing! Fixing...');
      const passwordHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
      
      // Try update with explicit column name
      const update = await pool.query(
        'UPDATE AdminUsers SET "passwordHash" = $1 WHERE username = $2',
        [passwordHash, 'admin']
      );
      console.log('Update result:', update.rowCount, 'rows affected');
      
      // Verify
      const verify = await pool.query('SELECT * FROM AdminUsers WHERE username = $1', ['admin']);
      console.log('After update - Has hash:', !!verify.rows[0]?.passwordHash);
      console.log('Hash length:', verify.rows[0]?.passwordHash?.length || 0);
    } else if (raw.rows.length > 0 && raw.rows[0].passwordHash) {
      console.log('\n✅ Password hash exists in database!');
      console.log('   Length:', raw.rows[0].passwordHash.length);
      console.log('   First 20 chars:', raw.rows[0].passwordHash.substring(0, 20));
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

diagnose();


