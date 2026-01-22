/**
 * Test login with actual database data
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../backend/config/database');

async function testLogin() {
  try {
    console.log('Testing login with database...\n');

    // Get user from database (using lowercase as PostgreSQL does)
    const result = await pool.query(
      'SELECT id, username, passwordhash, role FROM adminusers WHERE username = $1',
      ['admin']
    );

    if (result.rows.length === 0) {
      console.log('❌ Admin user not found!');
      return;
    }

    const user = result.rows[0];
    console.log('User found:');
    console.log('  Username:', user.username);
    console.log('  Has passwordhash:', !!user.passwordhash);
    console.log('  Hash length:', user.passwordhash?.length || 0);
    console.log('  Hash preview:', user.passwordhash?.substring(0, 30) || 'N/A');
    console.log('');

    if (!user.passwordhash) {
      console.log('❌ Password hash is NULL!');
      console.log('\nFix: Run this SQL in pgAdmin:');
      console.log(`
DELETE FROM adminusers WHERE username = 'admin';
INSERT INTO adminusers (username, passwordhash, role) 
VALUES ('admin', '\$2a\$10\$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'superadmin');
      `);
      return;
    }

    // Test password comparison
    console.log('Testing password "admin123"...');
    const isValid = await bcrypt.compare('admin123', user.passwordhash);
    console.log('  Password match:', isValid ? '✅ YES' : '❌ NO');
    console.log('');

    if (!isValid) {
      console.log('⚠️  Password hash does not match "admin123"!');
      console.log('\nGenerating new hash for "admin123"...');
      const newHash = await bcrypt.hash('admin123', 10);
      console.log('New hash:', newHash);
      console.log('\nUpdate database with:');
      console.log(`UPDATE adminusers SET passwordhash = '${newHash}' WHERE username = 'admin';`);
    } else {
      console.log('✅ Password hash is correct!');
      console.log('   Login should work now.');
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testLogin();



