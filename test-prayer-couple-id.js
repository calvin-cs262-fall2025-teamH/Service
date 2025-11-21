// Test prayer API with couple_id
const axios = require('axios');

const API_URL = 'http://localhost:4000/api';

async function testPrayerAPI() {
  try {
    console.log('🔐 Logging in as aaaaaa@calvin.edu...\n');

    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'aaaaaa@calvin.edu',
      password: 'password123'
    });

    const token = loginRes.data.token;
    console.log('✅ Login successful');
    console.log('Token:', token.substring(0, 20) + '...\n');

    // Test GET prayers
    console.log('📋 Testing GET /api/prayers...');
    const getPrayersRes = await axios.get(`${API_URL}/prayers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ GET prayers successful:');
    console.log('  Count:', getPrayersRes.data.data.length);
    console.table(getPrayersRes.data.data);

    // Test POST prayer
    console.log('\n➕ Testing POST /api/prayers...');
    const newPrayer = {
      title: 'Test Prayer - Using Couple ID',
      content: 'This prayer should work with couple_id now!'
    };

    const createRes = await axios.post(`${API_URL}/prayers`, newPrayer, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ CREATE prayer successful:');
    console.table([createRes.data.data]);

    const prayerId = createRes.data.data.id;

    // Test GET all prayers again
    console.log('\n📋 Testing GET /api/prayers again...');
    const getUpdatedRes = await axios.get(`${API_URL}/prayers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ GET prayers successful:');
    console.log('  Count:', getUpdatedRes.data.data.length);
    console.table(getUpdatedRes.data.data);

    // Test UPDATE prayer
    console.log(`\n✏️ Testing PUT /api/prayers/${prayerId}...`);
    const updateRes = await axios.put(`${API_URL}/prayers/${prayerId}`, {
      title: 'Updated Prayer Title',
      content: 'Updated content with couple_id'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ UPDATE prayer successful:');
    console.table([updateRes.data.data]);

    // Test TOGGLE answered
    console.log(`\n🔄 Testing PUT /api/prayers/${prayerId}/toggle-answered...`);
    const toggleRes = await axios.put(`${API_URL}/prayers/${prayerId}/toggle-answered`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ TOGGLE answered successful:');
    console.table([toggleRes.data.data]);

    // Test DELETE prayer
    console.log(`\n🗑️ Testing DELETE /api/prayers/${prayerId}...`);
    const deleteRes = await axios.delete(`${API_URL}/prayers/${prayerId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ DELETE prayer successful:', deleteRes.data.message);

    // Final GET to verify deletion
    console.log('\n📋 Final GET /api/prayers...');
    const finalRes = await axios.get(`${API_URL}/prayers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Final prayers count:', finalRes.data.data.length);
    console.table(finalRes.data.data);

    console.log('\n🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testPrayerAPI();
