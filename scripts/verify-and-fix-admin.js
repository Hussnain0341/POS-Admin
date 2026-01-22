/**
 * Verify and fix admin user password hash
 */

require('dotenv').config();
const { pool } = require('../backend/config/database');

async function verifyAndFix() {
  try {
    console.log('Checking admin user...\n');
    
    // Check current state
    const check = await pool.query(
      'SELECT username, passwordHash, role FROM AdminUsers WHERE username = $1',
      ['admin']
    );

    if (check.rows.length === 0) {
      console.log('❌ Admin user not found!');
      console.log('Creating admin user...');
      
      const passwordHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
      await pool.query(
        'INSERT INTO AdminUsers (username, passwordHash, role) VALUES ($1, $2, $3)',
        ['admin', passwordHash, 'superadmin']
      );
      console.log('✅ Admin user created!');
    } else {
      const user = check.rows[0];
      console.log('Admin user found:');
      console.log('  Username:', user.username);
      console.log('  Role:', user.role);
      console.log('  Has passwordHash:', !!user.passwordHash);
      
      if (!user.passwordHash) {
        console.log('\n⚠️  Password hash is NULL! Fixing...');
        
        const passwordHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
        const update = await pool.query(
          'UPDATE AdminUsers SET passwordHash = $1 WHERE username = $2',
          [passwordHash, 'admin']
        );
        
        console.log('✅ Password hash updated!');
        
        // Verify
        const verify = await pool.query(
          'SELECT passwordHash FROM AdminUsers WHERE username = $1',
          ['admin']
        );
        console.log('  Verification - Has hash:', !!verify.rows[0].passwordHash);
        console.log('  Hash length:', verify.rows[0].passwordHash?.length || 0);
      } else {
        console.log('  Hash length:', user.passwordHash.length);
        console.log('\n✅ Admin user is properly configured!');
      }
    }

    console.log('\n✅ Done!');
    console.log('   Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Details:', error);
    process.exit(1);
  }
}

verifyAndFix();



