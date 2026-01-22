#!/usr/bin/env node
/**
 * Generate a secure JWT secret for production
 */

const crypto = require('crypto');

const secret = crypto.randomBytes(64).toString('hex');

console.log('🔐 Generated JWT Secret:');
console.log('');
console.log(secret);
console.log('');
console.log('📝 Add this to your .env file as:');
console.log(`JWT_SECRET=${secret}`);
console.log('');
console.log('⚠️  Keep this secret secure and never commit it to version control!');

