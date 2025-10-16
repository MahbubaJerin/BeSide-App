// Test trip request creation
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000';

// Test credentials  
const testUser = {
  userName: 'nammu',
  password: 'Nammu@02'
};

async function testTripRequest() {
  try {
    console.log('🔐 Step 1: Logging in...');
    
    // Login to get token
    const loginResponse = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.text();
      throw new Error(`Login failed: ${loginResponse.status} - ${errorData}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    
    const token = loginData.token;
    const userId = loginData.data.user._id;
    
    console.log('🚀 Step 2: Creating trip request...');
    
    // Create trip request
    const tripData = {
      user: {
        userName: loginData.data.user.userName
      },
      destination: "Test Destination Street, Melbourne VIC",
      destinationType: "By Walk", 
      date: new Date().toISOString(),
      time: "14:30",
      genderPreference: "any",
      startLocation: {
        latitude: -37.8136,
        longitude: 144.9631,
        address: "Current location"
      },
      destinationLocation: {
        latitude: -37.8205,
        longitude: 144.9646,
        address: "Test Destination Street, Melbourne VIC"
      }
    };

    const tripResponse = await fetch(`${BASE_URL}/api/v1/trip/createTripReq`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tripData)
    });

    if (!tripResponse.ok) {
      const errorData = await tripResponse.text();
      throw new Error(`Trip creation failed: ${tripResponse.status} - ${errorData}`);
    }

    const tripResult = await tripResponse.json();
    console.log('✅ Trip request created successfully!');
    console.log('📋 Trip ID:', tripResult.data?.tripRequest?._id);
    console.log('🎯 Trip Request ID:', tripResult.data?.tripRequest?.tripReqId);
    
    console.log('🔍 Step 3: Checking if request appears in polling...');
    
    // Now test the polling endpoint to see if the request appears
    const pollingResponse = await fetch(`${BASE_URL}/api/v1/trip/pending-requests`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!pollingResponse.ok) {
      throw new Error(`Polling failed: ${pollingResponse.status}`);
    }
    
    const pollingResult = await pollingResponse.json();
    console.log('📥 Polling result:', JSON.stringify(pollingResult, null, 2));
    
    if (pollingResult.data.requests.length > 0) {
      console.log('✅ SUCCESS: Trip request is visible in polling!');
    } else {
      console.log('⚠️  WARNING: Trip request not visible in polling yet');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('📋 Full error:', error);
  }
}

testTripRequest();