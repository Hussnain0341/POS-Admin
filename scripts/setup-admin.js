/**
 * Script to create or update admin user
 * Usage: node scripts/setup-admin.js <username> <password>
 */

const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function generatePasswordHash() {
  const username = process.argv[2] || await question('Enter username: ');
  const password = process.argv[3] || await question('Enter password: ');

  if (!username || !password) {
    console.error('Username and password are required');
    process.exit(1);
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    console.log('\n=== Admin User Setup ===');
    console.log('Username:', username);
    console.log('Password Hash:', hash);
    console.log('\nSQL INSERT statement:');
    console.log(`INSERT INTO AdminUsers (username, passwordHash, role) VALUES ('${username}', '${hash}', 'superadmin') ON CONFLICT (username) DO UPDATE SET passwordHash = EXCLUDED.passwordHash;`);
    console.log('\nOr update existing user:');
    console.log(`UPDATE AdminUsers SET passwordHash = '${hash}' WHERE username = '${username}';`);
  } catch (error) {
    console.error('Error generating hash:', error);
    process.exit(1);
  }

  rl.close();
}

generatePasswordHash();




