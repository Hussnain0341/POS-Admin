/**
 * Generate a strong bcrypt password hash
 * 
 * Usage:
 *   node scripts/generate-password-hash.js "YourStrongPassword123!"
 * 
 * Or run interactively:
 *   node scripts/generate-password-hash.js
 */

const bcrypt = require('bcryptjs');
const readline = require('readline');

async function generateHash(password) {
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
}

function validatePasswordStrength(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const issues = [];
  
  if (password.length < minLength) {
    issues.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUpperCase) {
    issues.push('Password must contain at least one uppercase letter');
  }
  if (!hasLowerCase) {
    issues.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumbers) {
    issues.push('Password must contain at least one number');
  }
  if (!hasSpecialChar) {
    issues.push('Password must contain at least one special character (!@#$%^&*...)');
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

function generateStrongPassword() {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + special;
  let password = '';
  
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly (total length 16)
  for (let i = password.length; i < 16; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

async function main() {
  let password = process.argv[2];

  // If no password provided, ask interactively
  if (!password) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('\n🔐 Password Hash Generator\n');
    console.log('Options:');
    console.log('  1. Enter your own password');
    console.log('  2. Generate a strong password automatically\n');
    
    const choice = await new Promise(resolve => {
      rl.question('Choose option (1 or 2): ', resolve);
    });

    if (choice === '2') {
      password = generateStrongPassword();
      console.log(`\n✅ Generated strong password: ${password}`);
      console.log('⚠️  Save this password securely! You will need it to login.\n');
    } else {
      password = await new Promise(resolve => {
        rl.question('\nEnter your password: ', resolve);
      });
    }

    rl.close();
  }

  // Validate password strength
  const validation = validatePasswordStrength(password);
  
  if (!validation.isValid) {
    console.error('\n❌ Password does not meet strength requirements:\n');
    validation.issues.forEach(issue => console.error(`   - ${issue}`));
    console.error('\n💡 Password requirements:');
    console.error('   - At least 8 characters');
    console.error('   - At least one uppercase letter');
    console.error('   - At least one lowercase letter');
    console.error('   - At least one number');
    console.error('   - At least one special character\n');
    process.exit(1);
  }

  // Generate hash
  console.log('\n⏳ Generating password hash...\n');
  const hash = await generateHash(password);

  console.log('✅ Password hash generated successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 COPY THIS HASH TO UPDATE DATABASE:\n');
  console.log(hash);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('📝 SQL Command to update password:\n');
  console.log(`UPDATE adminusers SET passwordhash = '${hash}' WHERE username = 'admin';\n`);
  
  console.log('💡 Or use the password change API endpoint:');
  console.log('   POST /api/admin/change-password');
  console.log('   Body: { "currentPassword": "...", "newPassword": "..." }\n');
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});


