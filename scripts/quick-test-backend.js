// Quick Backend Test
// Run: node scripts/quick-test-backend.js

const http = require('http');

console.log('Testing if backend is running...\n');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/health',
  method: 'GET',
  timeout: 2000
};

const req = http.request(options, (res) => {
  console.log(`✅ Backend is running! Status: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Response:', data);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.log('❌ Backend is NOT running!');
  console.log('Error:', e.message);
  console.log('\n💡 Start backend: npm run server');
  process.exit(1);
});

req.on('timeout', () => {
  console.log('❌ Backend timeout - not responding');
  req.destroy();
  process.exit(1);
});

req.end();

