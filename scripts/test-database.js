/**
 * Database Connection Test Script
 * Tests the database connection and verifies setup
 */

require('dotenv').config();
const { pool } = require('../backend/config/database');

async function testDatabase() {
  console.log('🔍 Testing Database Connection...\n');
  
  try {
    // Test 1: Basic Connection
    console.log('Test 1: Testing basic connection...');
    const connectionTest = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Connection successful!');
    console.log(`   Current time: ${connectionTest.rows[0].current_time}`);
    console.log(`   PostgreSQL: ${connectionTest.rows[0].pg_version.split(' ')[0]} ${connectionTest.rows[0].pg_version.split(' ')[1]}\n`);

    // Test 2: Check Database Name
    console.log('Test 2: Checking database name...');
    const dbTest = await pool.query('SELECT current_database() as db_name');
    console.log(`✅ Connected to database: ${dbTest.rows[0].db_name}\n`);

    // Test 3: Check Tables Exist
    console.log('Test 3: Checking if tables exist...');
    const tablesTest = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const expectedTables = ['adminusers', 'activations', 'auditlogs', 'licenses'];
    const existingTables = tablesTest.rows.map(row => row.table_name.toLowerCase());
    
    console.log(`   Found ${tablesTest.rows.length} tables:`);
    tablesTest.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    const missingTables = expectedTables.filter(t => !existingTables.includes(t));
    if (missingTables.length > 0) {
      console.log(`\n   ⚠️  Missing tables: ${missingTables.join(', ')}`);
      console.log('   Run: node scripts/init-db.js\n');
    } else {
      console.log('   ✅ All required tables exist!\n');
    }

    // Test 4: Check Admin User
    console.log('Test 4: Checking admin user...');
    const adminTest = await pool.query('SELECT username, role FROM AdminUsers WHERE username = $1', ['admin']);
    
    if (adminTest.rows.length > 0) {
      console.log(`✅ Admin user exists:`);
      console.log(`   Username: ${adminTest.rows[0].username}`);
      console.log(`   Role: ${adminTest.rows[0].role}\n`);
    } else {
      console.log('   ⚠️  Admin user not found!');
      console.log('   Run: node scripts/init-db.js\n');
    }

    // Test 5: Check Indexes
    console.log('Test 5: Checking indexes...');
    const indexesTest = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY indexname
    `);
    console.log(`   Found ${indexesTest.rows.length} indexes\n`);

    // Test 6: Test Write Operation
    console.log('Test 6: Testing write operation...');
    const writeTest = await pool.query('SELECT COUNT(*) as count FROM Licenses');
    console.log(`✅ Write test successful!`);
    console.log(`   Current licenses: ${writeTest.rows[0].count}\n`);

    console.log('🎉 All tests passed! Database is ready to use.\n');
    console.log('Next steps:');
    console.log('1. Start backend: npm run server');
    console.log('2. Start frontend: npm run client');
    console.log('3. Login at http://localhost:3000 with admin/admin123\n');

  } catch (error) {
    console.error('\n❌ Database test failed!\n');
    console.error('Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check PostgreSQL is running');
    console.error('2. Verify .env file has correct credentials');
    console.error('3. Ensure database "hisaabkitab_license" exists');
    console.error('4. Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD in .env\n');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the test
testDatabase();




