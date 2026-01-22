/**
 * Fix admin user password hash in database
 */

require('dotenv').config();
const { pool } = require('../backend/config/database');

async function fixAdminPassword() {
  try {
    console.log('Fixing admin user password hash...\n');

    // Password hash for 'admin123'
    const passwordHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

    const result = await pool.query(
      `UPDATE AdminUsers 
       SET passwordHash = $1, role = 'superadmin'
       WHERE username = 'admin'
       RETURNING username, role`,
      [passwordHash]
    );

    if (result.rows.length === 0) {
      // Admin user doesn't exist, create it
      console.log('Admin user not found. Creating...');
      await pool.query(
        `INSERT INTO AdminUsers (username, passwordHash, role) 
         VALUES ('admin', $1, 'superadmin')`,
        [passwordHash]
      );
      console.log('✅ Admin user created!');
    } else {
      console.log('✅ Admin user password hash updated!');
      console.log('   Username:', result.rows[0].username);
      console.log('   Role:', result.rows[0].role);
    }

    console.log('\n✅ Fix complete!');
    console.log('   You can now login with:');
    console.log('   Username: admin');
    console.log('   Password: admin123\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixAdminPassword();



