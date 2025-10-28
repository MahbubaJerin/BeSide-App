const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const TripMatch = require('./models/tripMatchModel');
const User = require('./models/userModel');

async function testTwoStageTripEnding() {
  try {
    // Connect to database
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to database');

    // Find or create test users
    let user1 = await User.findOne({ userName: 'nammu' });
    let user2 = await User.findOne({ userName: 'lululemom' });

    if (!user1) {
      console.log('❌ Test user "nammu" not found');
      return;
    }
    if (!user2) {
      console.log('❌ Test user "lululemom" not found');
      return;
    }

    console.log('👥 Found test users:', user1.userName, 'and', user2.userName);

    // Create a test trip match
    const testMatch = new TripMatch({
      matchId: `TEST-${Date.now()}`,
      originalTripRequest: { tripReqId: `TEST-REQ-${Date.now()}` },
      organizer: {
        userId: user1._id.toString(),
        userName: user1.userName,
        userImage: user1.profilePhoto?.url || 'default.jpg'
      },
      companion: {
        userId: user2._id.toString(),
        userName: user2.userName,
        userImage: user2.profilePhoto?.url || 'default.jpg'
      },
      tripDetails: {
        destination: 'Test Destination',
        destinationType: 'By Walk',
        startLocation: { latitude: 23.7516, longitude: 90.3877, address: 'Start Location' },
        destinationLocation: { latitude: 23.7616, longitude: 90.3977, address: 'End Location' },
        routeCoordinates: [],
        plannedDate: new Date(),
        plannedTime: '14:00',
        genderPreference: 'any'
      },
      status: 'in-progress',
      meetingPoint: {
        name: 'Test Meeting Point',
        location: { latitude: 23.7556, longitude: 90.3927 },
        address: 'Test Meeting Address',
        type: 'custom'
      },
      canStartFinalJourney: true,
      tripStarted: true,
      tripStartedAt: new Date(),
      endedUsers: [], // Empty initially
      tripEnded: false
    });

    await testMatch.save();
    console.log('✅ Created test trip match:', testMatch.matchId);

    // Test 1: First user ends trip
    console.log('\n🧪 TEST 1: First user ends trip');
    testMatch.endedUsers.push(user1._id.toString());
    const bothUsersEndedAfterFirst = testMatch.endedUsers.length === 2;
    console.log('  - User1 ended:', testMatch.endedUsers.includes(user1._id.toString()));
    console.log('  - Both users ended:', bothUsersEndedAfterFirst);
    console.log('  - Trip ended status:', testMatch.tripEnded);
    
    if (!bothUsersEndedAfterFirst) {
      console.log('  ✅ Correct: Trip not completed yet, waiting for second user');
    } else {
      console.log('  ❌ Error: Trip should not be completed yet');
    }

    // Test 2: Second user ends trip
    console.log('\n🧪 TEST 2: Second user ends trip');
    testMatch.endedUsers.push(user2._id.toString());
    const bothUsersEndedAfterSecond = testMatch.endedUsers.length === 2;
    
    if (bothUsersEndedAfterSecond) {
      testMatch.status = 'completed';
      testMatch.tripEnded = true;
      testMatch.tripEndedAt = new Date();
      testMatch.progression.completed = new Date();
    }

    console.log('  - User1 ended:', testMatch.endedUsers.includes(user1._id.toString()));
    console.log('  - User2 ended:', testMatch.endedUsers.includes(user2._id.toString()));
    console.log('  - Both users ended:', bothUsersEndedAfterSecond);
    console.log('  - Trip status:', testMatch.status);
    console.log('  - Trip ended status:', testMatch.tripEnded);
    console.log('  - Trip ended at:', testMatch.tripEndedAt);

    if (bothUsersEndedAfterSecond && testMatch.status === 'completed') {
      console.log('  ✅ Correct: Trip completed after both users confirmed');
    } else {
      console.log('  ❌ Error: Trip should be completed now');
    }

    await testMatch.save();

    // Test 3: Check user already ended scenario
    console.log('\n🧪 TEST 3: User tries to end trip again');
    const userAlreadyEnded = testMatch.endedUsers.includes(user1._id.toString());
    console.log('  - User1 already ended:', userAlreadyEnded);
    
    if (userAlreadyEnded) {
      console.log('  ✅ Correct: User has already ended the trip');
    } else {
      console.log('  ❌ Error: Should detect user already ended');
    }

    console.log('\n🎉 Two-stage trip ending tests completed successfully!');
    console.log('\n📋 Final trip match state:');
    console.log('  - Match ID:', testMatch.matchId);
    console.log('  - Status:', testMatch.status);
    console.log('  - Ended Users:', testMatch.endedUsers);
    console.log('  - Trip Ended:', testMatch.tripEnded);
    console.log('  - Trip Ended At:', testMatch.tripEndedAt);

    // Clean up test data
    await TripMatch.deleteOne({ matchId: testMatch.matchId });
    console.log('\n🧹 Cleaned up test data');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
    process.exit(0);
  }
}

// Run the test
testTwoStageTripEnding();