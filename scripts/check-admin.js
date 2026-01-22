/**
 * Check admin user in database
 */

require('dotenv').config();
const { pool } = require('../backend/config/database');

async function checkAdmin() {
  try {
    const res = await pool.query(
      'SELECT username, passwordHash, role FROM AdminUsers WHERE username = $1',
      ['admin']
    );

    if (res.rows.length === 0) {
      console.log('❌ Admin user not found!');
      console.log('\nFix: Run the database setup script:');
      console.log('   node scripts/init-db.js');
      console.log('   OR run: database/02_COMPLETE_SETUP.sql in pgAdmin');
    } else {
      const user = res.rows[0];
      console.log('✅ Admin user found:');
      console.log('   Username:', user.username);
      console.log('   Role:', user.role);
      if (user.passwordHash) {
        console.log('   Password Hash:', user.passwordHash.substring(0, 20) + '...');
      } else {
        console.log('   Password Hash: NULL (PROBLEM!)');
      }
      
      if (!user.passwordHash) {
        console.log('\n⚠️  PROBLEM: passwordHash is NULL!');
        console.log('\nFix: Run this SQL in pgAdmin:');
        console.log(`
INSERT INTO AdminUsers (username, passwordHash, role) 
VALUES ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'superadmin')
ON CONFLICT (username) DO UPDATE 
SET passwordHash = EXCLUDED.passwordHash,
    role = EXCLUDED.role;
        `);
      } else {
        console.log('\n✅ Admin user is properly configured!');
      }
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAdmin();

