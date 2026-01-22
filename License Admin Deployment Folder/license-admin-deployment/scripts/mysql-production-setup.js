#!/usr/bin/env node
/**
 * MySQL Production Database Setup Script
 * Run this after deploying to production to set up the MySQL database
 */

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  console.log('🚀 Starting MySQL production database setup...\n');

  let connection;
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      multipleStatements: true
    });

    console.log('✅ Connected to MySQL server\n');

    // Read schema file
    const schemaPath = path.join(__dirname, '../database/01_MYSQL_SETUP.sql');
    let schemaSQL = '';

    if (fs.existsSync(schemaPath)) {
      schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    } else {
      console.error('❌ Schema file not found:', schemaPath);
      process.exit(1);
    }

    // Execute schema
    console.log('📋 Creating database and schema...');
    await connection.query(schemaSQL);
    console.log('✅ Database schema created successfully\n');

    // Switch to the database
    await connection.query('USE license_admin');

    // Create initial admin user
    const adminUsername = process.env.ADMIN_USERNAME || 'superadmin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
    
    console.log(`👤 Creating initial admin user: ${adminUsername}`);
    
    // Check if admin already exists
    const [existingAdmin] = await connection.query(
      'SELECT id FROM AdminUsers WHERE username = ?',
      [adminUsername]
    );

    if (existingAdmin.length > 0) {
      console.log('⚠️  Admin user already exists. Updating password...');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await connection.query(
        'UPDATE AdminUsers SET passwordHash = ? WHERE username = ?',
        [hashedPassword, adminUsername]
      );
      console.log('✅ Admin password updated');
    } else {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const adminId = uuidv4();

      await connection.query(
        `INSERT INTO AdminUsers (id, username, passwordHash, role, createdAt, updatedAt)
         VALUES (?, ?, ?, 'superadmin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [adminId, adminUsername, hashedPassword]
      );

      console.log('✅ Admin user created successfully');
    }

    console.log(`   Username: ${adminUsername}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('   ⚠️  IMPORTANT: Change this password immediately after first login!\n');

    // Verify setup
    console.log('🔍 Verifying database setup...');
    const [tables] = await connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'license_admin' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('✅ Database tables:');
    tables.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });

    console.log('\n✅ MySQL production database setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Update admin password after first login');
    console.log('   2. Test API endpoints');
    console.log('   3. Set up backup cron job');
    console.log('   4. Monitor logs in ./backend/logs/\n');

  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run setup
setupDatabase();

