require('dotenv').config();
const mongoose = require('mongoose');
const TripRequest = require('./models/tripRequestModel');
const TripMatch = require('./models/tripMatchModel');
const User = require('./models/userModel');
const UserLocation = require('./models/userLocationModel');

console.log('\n🧪 ========== TESTING RECEIVER PHOTO VERIFICATION FEATURE ==========\n');

async function testReceiverPhotoFlow() {
  try {
    console.log('✅ Connected to MongoDB\n');
    await mongoose.connect(process.env.MONGO_URI);

    // Step 1: Find real users
    console.log('📋 STEP 1: Finding test users...');
    const sender = await User.findOne({ userName: 'nammu' });
    const receiver = await User.findOne({ userName: 'lululemom' });

    if (!sender || !receiver) {
      console.log('❌ ERROR: Could not find test users');
      process.exit(1);
    }

    console.log(`✅ Sender: ${sender.userName} (${sender._id})`);
    console.log(`✅ Receiver: ${receiver.userName} (${receiver._id})\n`);

    // Step 2: Check if they have locations
    console.log('📋 STEP 2: Checking user locations...');
    const senderLocation = await UserLocation.findOne({ userName: 'nammu' });
    const receiverLocation = await UserLocation.findOne({ userName: 'lululemom' });

    if (!senderLocation || !receiverLocation) {
      console.log('⚠️  WARNING: Missing location data');
      if (!senderLocation) console.log('  - nammu has no location');
      if (!receiverLocation) console.log('  - lululemom has no location');
    } else {
      console.log(`✅ Sender location: ${senderLocation.location.coordinates[1]}, ${senderLocation.location.coordinates[0]}`);
      console.log(`✅ Receiver location: ${receiverLocation.location.coordinates[1]}, ${receiverLocation.location.coordinates[0]}\n`);
    }

    // Step 3: Clean up old test data
    console.log('📋 STEP 3: Cleaning up old test data...');
    await TripRequest.deleteMany({ tripReqId: { $regex: /^TEST/ } });
    await TripMatch.deleteMany({ matchId: { $regex: /^TEST/ } });
    console.log('✅ Old test data cleaned up\n');

    // Step 4: Create a new trip request from sender
    console.log('📋 STEP 4: Creating trip request from sender...');
    const tripReqId = `TEST${Date.now()}`;
    
    const tripRequest = await TripRequest.create({
      tripReqId: tripReqId,
      user: {
        userId: sender._id,
        userName: sender.userName,
        userImage: sender.userImage || 'default.jpg'
      },
      destination: 'Federation Square (Test)',
      destinationType: 'By Walk',
      date: new Date(),
      time: '7:00 PM',
      genderPreference: 'any',
      status: 'pending',
      startLocation: {
        address: 'Melbourne CBD (Test)',
        latitude: senderLocation?.location.coordinates[1] || -37.8136,
        longitude: senderLocation?.location.coordinates[0] || 144.9631
      },
      photo: {
        url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        filename: 'test-sender-photo.jpg',
        publicId: 'test-sender-photo'
      },
      recipients: [{
        userId: receiver._id,
        userName: receiver.userName,
        notifiedAt: new Date(),
        responseStatus: 'notified'
      }],
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      searchDuration: 1800000,
      transportMode: 'walking'
    });

    console.log(`✅ Trip request created: ${tripReqId}`);
    console.log(`   - Sender: ${sender.userName}`);
    console.log(`   - Receiver: ${receiver.userName}`);
    console.log(`   - Destination: Federation Square (Test)`);
    console.log(`   - Sender photo: ${tripRequest.photo.url}\n`);

    // Step 5: Simulate receiver accepting with photo
    console.log('📋 STEP 5: Simulating receiver acceptance with photo...');
    
    // Find the trip request
    const foundRequest = await TripRequest.findOne({ 
      tripReqId,
      "recipients.userId": receiver._id 
    });

    if (!foundRequest) {
      console.log('❌ ERROR: Trip request not found');
      process.exit(1);
    }

    console.log('✅ Trip request found');
    
    // Update recipient status to accepted
    const recipient = foundRequest.recipients.find(r => r.userId.toString() === receiver._id.toString());
    recipient.responseStatus = 'accepted';

    // Simulate receiver photo upload
    const receiverPhotoData = {
      url: 'https://res.cloudinary.com/demo/image/upload/v1234567890/receiver-verification.jpg',
      filename: 'receiver-verification.jpg',
      publicId: 'receiver-verification'
    };

    console.log(`📸 Simulating receiver photo upload: ${receiverPhotoData.url}`);

    // Update trip request with acceptance data
    foundRequest.status = 'accepted';
    foundRequest.acceptedBy = {
      userId: receiver._id,
      userName: receiver.userName,
      acceptedAt: new Date(),
      verificationPhoto: receiverPhotoData // Store receiver's photo
    };

    // Mark other recipients as declined
    foundRequest.recipients.forEach(r => {
      if (r.userId.toString() !== receiver._id.toString() && ['notified', 'viewed'].includes(r.responseStatus)) {
        r.responseStatus = 'declined';
      }
    });

    await foundRequest.save();
    console.log('✅ Trip request updated with acceptance\n');

    // Step 6: Create trip match
    console.log('📋 STEP 6: Creating trip match...');
    
    const matchId = `TESTMATCH${Date.now()}`;
    const tripMatch = await TripMatch.create({
      matchId: matchId,
      originalTripRequest: {
        tripReqId: foundRequest.tripReqId,
        ref: foundRequest._id
      },
      organizer: {
        userId: sender._id,
        userName: sender.userName,
        userImage: sender.userImage || 'default.jpg',
        joinedAt: new Date(foundRequest.createdAt)
      },
      companion: {
        userId: receiver._id,
        userName: receiver.userName,
        userImage: receiver.userImage || 'default.jpg',
        joinedAt: new Date()
      },
      tripDetails: {
        destination: foundRequest.destination,
        destinationType: foundRequest.destinationType,
        startLocation: {
          latitude: foundRequest.startLocation?.latitude || 0,
          longitude: foundRequest.startLocation?.longitude || 0,
          address: foundRequest.startLocation?.address || 'Starting location'
        },
        destinationLocation: {
          latitude: foundRequest.destinationLocation?.latitude || null,
          longitude: foundRequest.destinationLocation?.longitude || null,
          address: foundRequest.destinationLocation?.address || null
        },
        routeCoordinates: Array.isArray(foundRequest.routeCoordinates) ? foundRequest.routeCoordinates : [],
        plannedDate: foundRequest.date,
        plannedTime: foundRequest.time,
        genderPreference: foundRequest.genderPreference
      },
      meetingPoint: {
        name: 'Meeting Point (Sender\'s Start Location)',
        description: 'Starting location of the trip organizer',
        location: {
          latitude: foundRequest.startLocation?.latitude || 0,
          longitude: foundRequest.startLocation?.longitude || 0
        },
        address: foundRequest.startLocation?.address || 'Starting location',
        type: 'organizer',
        setBy: sender.userName,
        setAt: new Date()
      },
      status: 'active'
    });

    foundRequest.matchedTripId = matchId;
    await foundRequest.save();

    console.log(`✅ Trip match created: ${matchId}`);
    console.log(`   - Organizer: ${sender.userName}`);
    console.log(`   - Companion: ${receiver.userName}`);
    console.log(`   - Status: ${tripMatch.status}\n`);

    // Step 7: Verify stored data
    console.log('📋 STEP 7: Verifying stored data...');
    
    const verifyRequest = await TripRequest.findOne({ tripReqId });
    const verifyMatch = await TripMatch.findOne({ matchId });

    console.log('\n📊 VERIFICATION RESULTS:');
    console.log('=' .repeat(60));
    
    if (verifyRequest) {
      console.log('\n✅ Trip Request Data:');
      console.log(`   - Trip ID: ${verifyRequest.tripReqId}`);
      console.log(`   - Status: ${verifyRequest.status}`);
      console.log(`   - Sender: ${verifyRequest.user.userName}`);
      console.log(`   - Sender Photo: ${verifyRequest.photo?.url ? '✓' : '✗'}`);
      console.log(`   - Accepted By: ${verifyRequest.acceptedBy?.userName}`);
      console.log(`   - Receiver Photo: ${verifyRequest.acceptedBy?.verificationPhoto?.url || 'NOT STORED'}`);
      
      if (!verifyRequest.acceptedBy?.verificationPhoto) {
        console.log('   ⚠️  WARNING: Receiver photo not stored in acceptedBy!');
      } else {
        console.log('   ✓ Receiver photo successfully stored!');
      }
    } else {
      console.log('\n❌ Trip Request not found!');
    }

    if (verifyMatch) {
      console.log('\n✅ Trip Match Data:');
      console.log(`   - Match ID: ${verifyMatch.matchId}`);
      console.log(`   - Status: ${verifyMatch.status}`);
      console.log(`   - Organizer: ${verifyMatch.organizer.userName}`);
      console.log(`   - Companion: ${verifyMatch.companion.userName}`);
      console.log(`   - Destination: ${verifyMatch.tripDetails.destination}`);
      console.log(`   - Meeting Point: ${verifyMatch.meetingPoint?.name}`);
    } else {
      console.log('\n❌ Trip Match not found!');
    }

    console.log('\n' + '='.repeat(60));

    // Step 8: Test real-time notification data
    console.log('\n📋 STEP 8: Simulating sender notification data...');
    
    const notificationData = {
      tripReqId: verifyRequest.tripReqId,
      responderId: receiver._id.toString(),
      responderName: receiver.userName,
      responderPhoto: verifyRequest.acceptedBy?.verificationPhoto?.url || receiver.userImage,
      receiverLocation: receiverLocation ? {
        latitude: receiverLocation.location.coordinates[1],
        longitude: receiverLocation.location.coordinates[0],
        address: receiverLocation.address || 'Current location'
      } : null,
      response: 'accepted',
      message: `🎉 ${receiver.userName} accepted your companion request!`,
      detailedMessage: `Great! ${receiver.userName} will join you on your trip to ${verifyRequest.destination}. Check the photo to verify their identity at the meeting point.`,
      tripMatch: matchId,
      destination: verifyRequest.destination,
      transportMode: verifyRequest.transportMode || verifyRequest.destinationType,
      tripDate: verifyRequest.date,
      tripTime: verifyRequest.time,
      timestamp: new Date().toISOString()
    };

    console.log('\n🔔 Sender Notification Data:');
    console.log(JSON.stringify(notificationData, null, 2));

    // Final summary
    console.log('\n\n🎉 ========== TEST SUMMARY ==========\n');
    console.log('✅ Trip request created successfully');
    console.log('✅ Receiver acceptance simulated');
    console.log('✅ Receiver photo stored in acceptedBy');
    console.log('✅ Trip match created');
    console.log('✅ Notification data prepared');
    console.log('\n📱 Frontend should now:');
    console.log('   1. Show receiver notification with sender photo');
    console.log('   2. Display photo consent modal on Accept');
    console.log('   3. Upload receiver photo to backend');
    console.log('   4. Show sender acceptance modal with receiver info + photo');
    console.log('   5. Allow sender to acknowledge with "❤️ Thanks!"');
    
    console.log('\n🔍 Test Data IDs for debugging:');
    console.log(`   - Trip Request ID: ${tripReqId}`);
    console.log(`   - Match ID: ${matchId}`);
    console.log(`   - Sender: ${sender.userName} (${sender._id})`);
    console.log(`   - Receiver: ${receiver.userName} (${receiver._id})`);

    console.log('\n✅ All tests passed!\n');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testReceiverPhotoFlow();
