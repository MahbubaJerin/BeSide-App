// Test script to debug trip request creation
const fetch = require('node-fetch');

async function testTripRequest() {
  try {
    // First, let's try different password variations for nammu
    const passwords = ['nammu123', 'password', '123456', 'nammu', 'test123'];
    let loginResult = null;
    let token = null;
    let user = null;

    for (const password of passwords) {
      console.log(`🔐 Trying login with password: ${password}`);
      const loginResponse = await fetch('http://localhost:5000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userName: 'nammu',
          password: password
        })
      });

      loginResult = await loginResponse.json();
      if (loginResult.status === 'success') {
        console.log('✅ Login successful!');
        token = loginResult.token;
        user = loginResult.data.user;
        break;
      }
    }

    if (!token) {
      console.error('❌ Login failed with all passwords. Response:', JSON.stringify(loginResult, null, 2));
      return;
    }

    const token = loginResult.token;
    const user = loginResult.data.user;

    // Now test trip request creation
    const tripRequestData = {
      user: { 
        userId: user._id, 
        userName: user.userName, 
        userImage: user.profilePhoto || "default.jpg" 
      },
      destination: "Find Companion",
      destinationType: "By Walk",
      date: new Date(),
      time: "12:00",
      genderPreference: "any",
      startLocation: {
        latitude: 40.7128,
        longitude: -74.0060,
        address: "Current location"
      },
      destinationLocation: null,
      routeCoordinates: [],
      transportMode: "walking"
    };

    console.log('📤 Sending trip request data:', JSON.stringify(tripRequestData, null, 2));

    const tripResponse = await fetch('http://localhost:5000/api/v1/trip/createTripReq', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(tripRequestData)
    });

    const tripResult = await tripResponse.json();
    console.log('🚗 Trip request response:', JSON.stringify(tripResult, null, 2));
    console.log('📊 Response status:', tripResponse.status);

    if (tripResult.status === 'success') {
      console.log('✅ Trip request created successfully!');
      console.log('🆔 Trip Request ID:', tripResult.data.tripRequest.tripReqId);
    } else {
      console.error('❌ Trip request failed:', tripResult.message);
    }

  } catch (error) {
    console.error('🚨 Test error:', error.message);
  }
}

testTripRequest();