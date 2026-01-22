// PostgreSQL Connection Test Script
// Run: node scripts/test-postgres-connection.js

require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

console.log('========================================');
console.log('🔍 PostgreSQL Connection Test');
console.log('========================================\n');

// Display environment variables
console.log('Environment Variables:');
console.log('  DB_HOST:', process.env.DB_HOST || 'not set');
console.log('  DB_PORT:', process.env.DB_PORT || 'not set');
console.log('  DB_USER:', process.env.DB_USER || 'not set');
console.log('  DB_NAME:', process.env.DB_NAME || 'not set');
console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? `[SET - ${process.env.DB_PASSWORD.length} chars]` : 'NOT SET');
console.log('  DB_PASSWORD type:', typeof process.env.DB_PASSWORD);
console.log('');

// Test different connection configurations
const testConfigs = [
  {
    name: 'Current .env Configuration',
    config: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'license_admin',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    }
  },
  {
    name: 'Default PostgreSQL (postgres user)',
    config: {
      host: 'localhost',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: process.env.DB_PASSWORD || '',
    }
  },
  {
    name: 'Try without password (Expected to fail)',
    config: {
      host: 'localhost',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: undefined, // No password
    },
    expectFailure: true // This test is expected to fail
  }
];

async function testConnection(name, config, expectFailure = false) {
  console.log(`\n📋 Testing: ${name}`);
  console.log('   Config:', {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password ? '[HIDDEN]' : (config.password === undefined ? '[UNDEFINED]' : '[EMPTY STRING]')
  });
  
  // Don't pass undefined password - pg library doesn't like it
  const poolConfig = { ...config };
  if (poolConfig.password === undefined) {
    delete poolConfig.password; // Remove undefined password
  }
  
  const pool = new Pool(poolConfig);
  
  try {
    const result = await pool.query('SELECT NOW(), current_database(), current_user');
    
    if (expectFailure) {
      console.log('   ⚠️  UNEXPECTED SUCCESS (was expecting failure)');
      await pool.end();
      return false;
    }
    
    console.log('   ✅ SUCCESS!');
    console.log('   Time:', result.rows[0].now);
    console.log('   Database:', result.rows[0].current_database);
    console.log('   User:', result.rows[0].current_user);
    
    // Try to list databases
    const dbResult = await pool.query('SELECT datname FROM pg_database WHERE datistemplate = false');
    console.log('   Available databases:', dbResult.rows.map(r => r.datname).join(', '));
    
    await pool.end();
    return true;
  } catch (error) {
    if (expectFailure) {
      console.log('   ✅ EXPECTED FAILURE (as intended)');
      console.log('   Error:', error.message);
      await pool.end().catch(() => {});
      return true; // Count as success since we expected it to fail
    }
    
    console.log('   ❌ FAILED');
    console.log('   Error:', error.message);
    console.log('   Code:', error.code);
    
    await pool.end().catch(() => {});
    return false;
  }
}

async function checkPostgreSQLService() {
  console.log('\n📋 Checking PostgreSQL Service Status...');
  
  // Try to connect to PostgreSQL server (any database)
  const testPool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.env.DB_PASSWORD || '',
    connectionTimeoutMillis: 2000,
  });
  
  try {
    await testPool.query('SELECT version()');
    console.log('   ✅ PostgreSQL service is running');
    await testPool.end();
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('   ❌ PostgreSQL service is NOT running');
      console.log('   💡 Start PostgreSQL service or check if it\'s installed');
    } else if (error.code === '28P01') {
      console.log('   ⚠️  PostgreSQL is running but authentication failed');
      console.log('   💡 Check your password');
    } else {
      console.log('   ⚠️  Error:', error.message);
    }
    await testPool.end().catch(() => {});
    return false;
  }
}

async function runTests() {
  const isRunning = await checkPostgreSQLService();
  
  if (!isRunning) {
    console.log('\n⚠️  Cannot proceed with connection tests - PostgreSQL service issue');
    console.log('\n💡 Solutions:');
    console.log('   1. Start PostgreSQL service');
    console.log('   2. Check if PostgreSQL is installed');
    console.log('   3. Verify PostgreSQL is listening on port 5432');
    return;
  }
  
  console.log('\n========================================');
  console.log('Testing Connection Configurations');
  console.log('========================================');
  
  let successCount = 0;
  for (const test of testConfigs) {
    const success = await testConnection(test.name, test.config, test.expectFailure);
    if (success) successCount++;
  }
  
  console.log('\n========================================');
  console.log(`Results: ${successCount}/${testConfigs.length} configurations worked`);
  console.log('========================================');
  
  if (successCount === 0) {
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check PostgreSQL is running: pg_ctl status');
    console.log('   2. Verify password in backend/.env');
    console.log('   3. Check if database exists: psql -l');
    console.log('   4. Try connecting manually: psql -U postgres -h localhost');
  }
}

runTests().catch(console.error);

