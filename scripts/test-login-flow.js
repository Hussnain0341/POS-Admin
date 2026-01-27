// Test Login Flow
// Run: node scripts/test-login-flow.js

require('dotenv').config({ path: './backend/.env' });
const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function testLogin() {
  console.log('========================================');
  console.log('🔍 Testing Login Flow');
  console.log('========================================\n');

  try {
    console.log('1. Testing login endpoint...');
    const response = await axios.post(`${API_URL}/admin/login`, {
      username: 'admin',
      password: 'admin123'
    });

    console.log('✅ Login successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.require2FA) {
      console.log('\n2. 2FA required - checking tempToken...');
      if (response.data.tempToken) {
        console.log('✅ Temp token received:', response.data.tempToken.substring(0, 20) + '...');
        console.log('📧 Email should be sent to:', response.data.email);
        console.log('\n💡 Check your email for the 6-digit code!');
      } else {
        console.log('❌ No tempToken in response');
      }
    } else if (response.data.token) {
      console.log('\n✅ Direct token received (2FA disabled)');
    }

  } catch (error) {
    console.log('❌ Login failed!');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data);
      
      if (error.response.status === 503) {
        console.log('\n⚠️  Service Unavailable - Check:');
        console.log('  1. Is SMTP configured in backend/.env?');
        console.log('  2. Does login_2fa_codes table exist?');
        console.log('  3. Run database/SETUP.sql if not done');
      } else if (error.response.status === 429) {
        console.log('\n⚠️  Rate limited - restart backend to reset');
      } else if (error.response.status === 401) {
        console.log('\n⚠️  Invalid credentials - check username/password');
      }
    } else if (error.request) {
      console.log('❌ No response from server');
      console.log('   Make sure backend is running: npm run server');
    } else {
      console.log('Error:', error.message);
    }
  }
}

testLogin();


