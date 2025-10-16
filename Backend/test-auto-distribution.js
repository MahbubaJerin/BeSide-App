// Test automatic trip distribution 
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000';

const senderCredentials = {
  userName: 'nammu',
  password: 'Nammu@02'
};

const receiverCredentials = {
  userName: 'lululemom', 
  password: 'Lululu3@'
};

async function testAutoDistribution() {
  try {
    console.log('🧪 === TESTING AUTOMATIC TRIP DISTRIBUTION ===\n');
    
    // Step 1: Authenticate both users
    console.log('🔐 Authenticating users...');
    
    const senderLogin = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(senderCredentials)
    });
    
    const receiverLogin = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(receiverCredentials)
    });
    
    const senderData = await senderLogin.json();
    const receiverData = await receiverLogin.json();
    
    console.log('✅ Both users authenticated');
    
    // Step 2: Set locations
    console.log('📍 Setting user locations...');
    
    await fetch(`${BASE_URL}/api/v1/location/update`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${senderData.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latitude: -37.8136,
        longitude: 144.9631,
        isActive: true,
        shareLocation: true,
        visibleToOthers: true
      })
    });
    
    await fetch(`${BASE_URL}/api/v1/location/update`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${receiverData.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latitude: -37.8140,  // 400m away
        longitude: 144.9635,
        isActive: true,
        shareLocation: true,
        visibleToOthers: true
      })
    });
    
    console.log('✅ Locations set for both users');
    
    // Step 3: Create trip request (should auto-distribute now)
    console.log('\n🎯 Creating trip request with auto-distribution...');
    
    const tripData = {
      user: {
        userName: senderData.data.user.userName
      },
      destination: "Auto-Distributed Trip Test",
      destinationType: "By Walk", 
      date: new Date().toISOString(),
      time: "15:00",
      genderPreference: "any",
      startLocation: {
        latitude: -37.8136,
        longitude: 144.9631,
        address: "Test Starting Point"
      },
      destinationLocation: {
        latitude: -37.8176,
        longitude: 144.9685,
        address: "Auto-Distributed Trip Test"
      }
    };

    const tripResponse = await fetch(`${BASE_URL}/api/v1/trip/createTripReq`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${senderData.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tripData)
    });

    const tripResult = await tripResponse.json();
    console.log('✅ Trip request created');
    console.log('🎯 Trip Request ID:', tripResult.data?.tripRequest?.tripReqId);
    
    // Step 4: Wait a moment then check if it appears in receiver polling
    console.log('\n⏳ Waiting 2 seconds then checking receiver polling...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const pollingResponse = await fetch(`${BASE_URL}/api/v1/trip/pending-requests`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${receiverData.token}`,
        'Content-Type': 'application/json'
      }
    });

    const pollingData = await pollingResponse.json();
    console.log('🔄 Polling Result:', pollingData.results, 'requests found');
    
    if (pollingData.results > 0) {
      console.log('🎉 SUCCESS: Auto-distribution working!');
      console.log('📋 Trip appears in receiver polling without manual sendTripRequestToNearby call');
      pollingData.data.requests.forEach((request, index) => {
        console.log(`  ${index + 1}. From: ${request.user.userName} → ${request.destination}`);
      });
    } else {
      console.log('❌ FAILED: Trip not visible in receiver polling');
      console.log('📋 Auto-distribution may not be working correctly');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAutoDistribution();