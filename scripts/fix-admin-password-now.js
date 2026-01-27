// Fix Admin Password
// Run: node scripts/fix-admin-password-now.js

require('dotenv').config({ path: './backend/.env' });
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'hisaabkitab_license',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function fixAdmin() {
  try {
    console.log('Connecting to database...');
    
    // Generate new hash for admin123
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);
    console.log('Generated hash:', hash);
    
    // Update admin user
    const result = await pool.query(
      `UPDATE adminusers 
       SET passwordhash = $1 
       WHERE username = 'admin' 
       RETURNING id, username, role`,
      [hash]
    );
    
    if (result.rows.length === 0) {
      // Create admin user if doesn't exist
      console.log('Admin user not found, creating...');
      const insertResult = await pool.query(
        `INSERT INTO adminusers (username, passwordhash, role) 
         VALUES ('admin', $1, 'superadmin') 
         RETURNING id, username, role`,
        [hash]
      );
      console.log('✅ Admin user created:', insertResult.rows[0]);
    } else {
      console.log('✅ Admin user updated:', result.rows[0]);
    }
    
    // Verify
    const verify = await pool.query(
      'SELECT username, role FROM adminusers WHERE username = $1',
      ['admin']
    );
    console.log('\n✅ Verification:');
    console.log('   Username:', verify.rows[0].username);
    console.log('   Role:', verify.rows[0].role);
    console.log('   Password: admin123');
    
    await pool.end();
    console.log('\n✅ Done! Try logging in now.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

fixAdmin();


