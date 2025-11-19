// Test prayer API endpoints
const fetch = require('node-fetch');

const BASE_URL = 'http://153.106.87.206:4000';

// Replace with your actual auth token
const TOKEN = 'YOUR_TOKEN_HERE';

async function testPrayerAPI() {
  console.log('🧪 Testing Prayer API...\n');

  try {
    // Test GET /api/prayers
    console.log('1. Testing GET /api/prayers');
    const response = await fetch(`${BASE_URL}/api/prayers`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('   ✅ GET prayers successful\n');
    } else {
      console.log('   ❌ GET prayers failed\n');
    }

  } catch (error) {
    console.error('   ❌ Error:', error.message, '\n');
  }
}

// Get token from command line or prompt user
const token = process.argv[2];
if (token) {
  testPrayerAPI();
} else {
  console.log('Usage: node test-prayer-api.js <YOUR_AUTH_TOKEN>');
  console.log('\nTo get your token:');
  console.log('1. Open the app and log in');
  console.log('2. Check the logs for "[getToken] Token retrieved: ..."');
  console.log('3. Copy the token and run: node test-prayer-api.js <token>');
}
