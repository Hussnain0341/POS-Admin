// Test Login Endpoint
// Run: node scripts/test-login-endpoint.js

const http = require('http');

console.log('Testing login endpoint...\n');

const postData = JSON.stringify({
  username: 'admin',
  password: 'admin123'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/admin/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  },
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('\n✅ Response:', JSON.stringify(json, null, 2));
      
      if (json.token) {
        console.log('\n✅ Login successful! Token received.');
      } else if (json.require2FA) {
        console.log('\n⚠️  2FA required (but should be disabled)');
      } else {
        console.log('\n❌ Unexpected response');
      }
    } catch (e) {
      console.log('\nResponse (not JSON):', data);
    }
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.log('❌ Error:', e.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.log('❌ Timeout');
  req.destroy();
  process.exit(1);
});

req.write(postData);
req.end();


