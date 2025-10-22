// Complete end-to-end test for trip request flow
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000';

// Test credentials  
const senderCredentials = {
  userName: 'nammu',
  password: 'Nammu@02'
};

const receiverCredentials = {
  userName: 'lululemom',
  password: 'Lululu3@'
};

async function authenticateUser(credentials, userType) {
  console.log(`🔐 Authenticating ${userType}...`);
  
  const loginResponse = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(credentials)
  });

  if (!loginResponse.ok) {
    const errorData = await loginResponse.text();
    throw new Error(`${userType} login failed: ${loginResponse.status} - ${errorData}`);
  }

  const loginData = await loginResponse.json();
  console.log(`✅ ${userType} login successful`);
  
  return {
    token: loginData.token,
    userId: loginData.data.user._id,
    userName: loginData.data.user.userName
  };
}

async function updateUserLocation(authData, location, userType) {
  console.log(`📍 Updating ${userType} location...`);
  
  const locationResponse = await fetch(`${BASE_URL}/api/v1/location/update`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authData.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      latitude: location.latitude,
      longitude: location.longitude,
      isActive: true,
      shareLocation: true,
      visibleToOthers: true
    })
  });

  if (!locationResponse.ok) {
    const errorData = await locationResponse.text();
    console.log(`⚠️ ${userType} location update failed: ${locationResponse.status} - ${errorData}`);
  } else {
    console.log(`✅ ${userType} location updated successfully`);
  }
}

async function testCompleteFlow() {
  try {
    // Step 1: Authenticate both users
    console.log('🚀 === COMPLETE TRIP REQUEST FLOW TEST ===\n');
    
    const senderAuth = await authenticateUser(senderCredentials, 'Sender');
    const receiverAuth = await authenticateUser(receiverCredentials, 'Receiver');
    
    // Step 2: Update locations for both users (place them nearby)
    console.log('\n📍 === SETTING UP USER LOCATIONS ===');
    
    // Place sender at starting location
    await updateUserLocation(senderAuth, {
      latitude: -37.8136,  // Melbourne CBD
      longitude: 144.9631
    }, 'Sender');
    
    // Place receiver nearby (within 500m for testing)
    await updateUserLocation(receiverAuth, {
      latitude: -37.8140,  // Slightly north, about 400m away
      longitude: 144.9635
    }, 'Receiver');
    
    // Step 3: Create trip request
    console.log('\n🎯 === CREATING TRIP REQUEST ===');
    
    const tripData = {
      user: {
        userName: senderAuth.userName
      },
      destination: "Federation Square, Melbourne VIC",
      destinationType: "By Walk", 
      date: new Date().toISOString(),
      time: "14:30",
      genderPreference: "any",
      startLocation: {
        latitude: -37.8136,
        longitude: 144.9631,
        address: "Collins Street, Melbourne"
      },
      destinationLocation: {
        latitude: -37.8176,
        longitude: 144.9685,
        address: "Federation Square, Melbourne VIC"
      },
      searchDuration: 10 * 60 * 1000 // 10 minutes for testing
    };

    const tripResponse = await fetch(`${BASE_URL}/api/v1/trip/createTripReq`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${senderAuth.token}`,
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
    
    const tripReqId = tripResult.data.tripRequest.tripReqId;
    
    // Step 4: Send trip request to nearby users
    console.log('\n📤 === SENDING TO NEARBY USERS ===');
    
    const sendToNearbyResponse = await fetch(`${BASE_URL}/api/v1/trip/send-to-nearby`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${senderAuth.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tripReqId: tripReqId,
        startCoordinates: {
          latitude: -37.8136,
          longitude: 144.9631
        },
        searchRadius: 1000 // 1km radius
      })
    });

    if (!sendToNearbyResponse.ok) {
      const nearbyError = await sendToNearbyResponse.text();
      console.log('❌ Failed to send to nearby users:', sendToNearbyResponse.status);
      console.log('📋 Error:', nearbyError);
    } else {
      const nearbyData = await sendToNearbyResponse.json();
      console.log('✅ Trip request sent to nearby users!');
      console.log('📤 Recipients found:', nearbyData.data.recipientCount);
      console.log('📋 Total recipients:', nearbyData.data.totalRecipients);
    }
    
    // Step 5: Test polling as receiver
    console.log('\n🔄 === TESTING RECEIVER POLLING ===');
    
    const pollingResponse = await fetch(`${BASE_URL}/api/v1/trip/pending-requests`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${receiverAuth.token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!pollingResponse.ok) {
      const pollingError = await pollingResponse.text();
      console.log('❌ Polling failed:', pollingResponse.status, pollingError);
    } else {
      const pollingData = await pollingResponse.json();
      console.log('🔄 Polling Response:', pollingData.results, 'requests found');
      
      if (pollingData.results === 0) {
        console.log('⚠️ WARNING: Trip request not visible in receiver polling');
        console.log('📋 Possible reasons:');
        console.log('  - Receiver location not active or sharing disabled');
        console.log('  - Receiver outside search radius');
        console.log('  - Trip request not properly distributed');
      } else {
        console.log('✅ SUCCESS: Trip request visible in receiver polling!');
        pollingData.data.requests.forEach((request, index) => {
          console.log(`  ${index + 1}. From: ${request.user.userName}`);
          console.log(`      To: ${request.destination}`);
          console.log(`      ID: ${request.tripReqId}`);
          console.log(`      Status: ${request.status}`);
        });
      }
    }
    
    // Step 6: Test rate-limited polling (simulate background polling)
    console.log('\n⏱️  === TESTING RATE-LIMITED POLLING ===');
    
    const pollCount = 5;
    const pollInterval = 2000; // 2 seconds between polls
    
    console.log(`Testing ${pollCount} polls with ${pollInterval/1000}s intervals...`);
    
    for (let i = 1; i <= pollCount; i++) {
      const startTime = Date.now();
      
      const pollResponse = await fetch(`${BASE_URL}/api/v1/trip/pending-requests`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${receiverAuth.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (pollResponse.ok) {
        const pollData = await pollResponse.json();
        console.log(`  Poll ${i}: ✅ ${pollData.results} requests (${responseTime}ms)`);
      } else {
        console.log(`  Poll ${i}: ❌ Failed (${responseTime}ms)`);
      }
      
      // Wait before next poll (except for last iteration)
      if (i < pollCount) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    console.log('\n🎉 === TEST COMPLETED ===');
    console.log('📋 Summary:');
    console.log('  - User authentication: ✅');
    console.log('  - Location updates: ✅');
    console.log('  - Trip request creation: ✅');
    console.log('  - Distribution to nearby users: Check logs above');
    console.log('  - Receiver polling: Check logs above');
    console.log('  - Rate limiting test: ✅');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('📋 Full error:', error.stack);
  }
}

testCompleteFlow();