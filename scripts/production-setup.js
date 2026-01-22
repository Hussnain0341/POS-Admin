#!/usr/bin/env node
/**
 * Production Database Setup Script
 * Run this after deploying to production to set up the database
 */

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function setupDatabase() {
  console.log('🚀 Starting production database setup...\n');

  try {
    // Read schema file
    const schemaPath = path.join(__dirname, '../database/02_COMPLETE_SETUP.sql');
    let schemaSQL = '';

    if (fs.existsSync(schemaPath)) {
      schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    } else {
      // Fallback to basic schema
      schemaSQL = `
        -- Create tables if they don't exist
        CREATE TABLE IF NOT EXISTS adminusers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username VARCHAR(50) UNIQUE NOT NULL,
          passwordhash TEXT NOT NULL,
          role VARCHAR(20) DEFAULT 'admin',
          createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS licenses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          licensekey VARCHAR(50) UNIQUE NOT NULL,
          tenantname VARCHAR(100) NOT NULL,
          plan VARCHAR(50),
          maxdevices INTEGER DEFAULT 1,
          maxusers INTEGER DEFAULT 1,
          features JSONB DEFAULT '{}',
          startdate DATE,
          expirydate DATE NOT NULL,
          status VARCHAR(20) DEFAULT 'active',
          createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS activations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          licenseid UUID REFERENCES licenses(id) ON DELETE CASCADE,
          deviceid TEXT NOT NULL,
          activatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          lastcheck TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(20) DEFAULT 'active',
          UNIQUE(licenseid, deviceid)
        );

        CREATE TABLE IF NOT EXISTS auditlogs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          licenseid UUID REFERENCES licenses(id) ON DELETE SET NULL,
          action VARCHAR(50) NOT NULL,
          details JSONB,
          ipaddress VARCHAR(45),
          useragent TEXT,
          createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
        CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(licensekey);
        CREATE INDEX IF NOT EXISTS idx_activations_license ON activations(licenseid);
        CREATE INDEX IF NOT EXISTS idx_auditlogs_license ON auditlogs(licenseid);
        CREATE INDEX IF NOT EXISTS idx_auditlogs_created ON auditlogs(createdat);
      `;
    }

    // Execute schema
    console.log('📋 Creating database schema...');
    await pool.query(schemaSQL);
    console.log('✅ Database schema created successfully\n');

    // Create initial admin user
    const adminUsername = process.env.ADMIN_USERNAME || 'superadmin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
    
    console.log(`👤 Creating initial admin user: ${adminUsername}`);
    
    // Check if admin already exists
    const existingAdmin = await pool.query(
      'SELECT id FROM adminusers WHERE username = $1',
      [adminUsername]
    );

    if (existingAdmin.rows.length > 0) {
      console.log('⚠️  Admin user already exists. Skipping...\n');
    } else {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const adminId = uuidv4();

      await pool.query(
        `INSERT INTO adminusers (id, username, passwordhash, role, createdat, updatedat)
         VALUES ($1, $2, $3, 'superadmin', NOW(), NOW())`,
        [adminId, adminUsername, hashedPassword]
      );

      console.log('✅ Admin user created successfully');
      console.log(`   Username: ${adminUsername}`);
      console.log(`   Password: ${adminPassword}`);
      console.log('   ⚠️  IMPORTANT: Change this password immediately after first login!\n');
    }

    // Verify setup
    console.log('🔍 Verifying database setup...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('✅ Database tables:');
    tables.rows.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });

    console.log('\n✅ Production database setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Update admin password after first login');
    console.log('   2. Test API endpoints');
    console.log('   3. Set up backup cron job');
    console.log('   4. Monitor logs in ./backend/logs/\n');

  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run setup
setupDatabase();


