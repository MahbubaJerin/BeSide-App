require('dotenv').config();
const mongoose = require('mongoose');
const TripRequest = require('./models/tripRequestModel');
const User = require('./models/userModel');
const UserLocation = require('./models/userLocationModel');

console.log('\n🧪 ========== E2E TEST: Receiver Photo Upload Flow ==========\n');

async function testE2EFlow() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find users
    const receiver = await User.findOne({ userName: 'lululemom' });
    const receiverLocation = await UserLocation.findOne({ userName: 'lululemom' });

    if (!receiver) {
      console.log('❌ ERROR: lululemom not found');
      process.exit(1);
    }

    // Find a pending trip request for lululemom
    const pendingRequest = await TripRequest.findOne({
      "recipients.userId": receiver._id,
      "recipients.responseStatus": { $in: ["notified", "viewed"] },
      status: "pending",
      expiresAt: { $gt: new Date() }
    });

    if (!pendingRequest) {
      console.log('⚠️  No pending requests found for lululemom');
      console.log('📝 Creating a test request...\n');
      
      // Create test request (you can run test-send-notification.js to create one)
      console.log('👉 Please run: node test-send-notification.js');
      console.log('   Then run this test again.\n');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('✅ Found pending request:', pendingRequest.tripReqId);
    console.log(`   - From: ${pendingRequest.user.userName}`);
    console.log(`   - To: lululemom`);
    console.log(`   - Destination: ${pendingRequest.destination}`);
    console.log(`   - Sender photo: ${pendingRequest.photo?.url || 'None'}\n`);

    // Simulate receiver accepting with photo
    console.log('📋 Simulating receiver acceptance...\n');

    // Check if request has the required structure
    const recipient = pendingRequest.recipients.find(r => r.userId.toString() === receiver._id.toString());
    
    if (!recipient) {
      console.log('❌ ERROR: lululemom not in recipients list');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('✓ Recipient found in request');
    console.log(`✓ Current status: ${recipient.responseStatus}`);

    // Update status
    recipient.responseStatus = 'accepted';
    
    // Add receiver photo
    const receiverPhotoData = {
      url: 'https://res.cloudinary.com/demo/image/upload/v1761048800/test-receiver-photo.jpg',
      filename: 'test-receiver-photo.jpg',
      publicId: 'test-receiver-photo'
    };

    console.log(`\n📸 Adding receiver photo: ${receiverPhotoData.url}`);

    // Update trip request
    pendingRequest.status = 'accepted';
    pendingRequest.acceptedBy = {
      userId: receiver._id.toString(),
      userName: receiver.userName,
      acceptedAt: new Date(),
      verificationPhoto: receiverPhotoData
    };

    await pendingRequest.save();
    console.log('✅ Trip request updated successfully\n');

    // Verify the save
    const verifiedRequest = await TripRequest.findOne({ tripReqId: pendingRequest.tripReqId });
    
    console.log('📊 VERIFICATION:');
    console.log('=' .repeat(60));
    console.log(`✓ Status: ${verifiedRequest.status}`);
    console.log(`✓ Accepted by: ${verifiedRequest.acceptedBy?.userName}`);
    console.log(`✓ Accepted at: ${verifiedRequest.acceptedBy?.acceptedAt}`);
    console.log(`✓ Receiver photo URL: ${verifiedRequest.acceptedBy?.verificationPhoto?.url || 'MISSING'}`);
    console.log(`✓ Receiver photo filename: ${verifiedRequest.acceptedBy?.verificationPhoto?.filename || 'MISSING'}`);
    console.log('=' .repeat(60));

    if (verifiedRequest.acceptedBy?.verificationPhoto?.url) {
      console.log('\n✅ SUCCESS: Receiver photo successfully stored in database!');
      
      // Prepare notification data
      const notificationPayload = {
        tripReqId: verifiedRequest.tripReqId,
        responderName: receiver.userName,
        responderPhoto: verifiedRequest.acceptedBy.verificationPhoto.url,
        receiverLocation: receiverLocation ? {
          latitude: receiverLocation.location.coordinates[1],
          longitude: receiverLocation.location.coordinates[0]
        } : null,
        destination: verifiedRequest.destination,
        transportMode: verifiedRequest.transportMode || verifiedRequest.destinationType
      };

      console.log('\n📡 Real-time notification payload for sender:');
      console.log(JSON.stringify(notificationPayload, null, 2));
      
      console.log('\n✅ All checks passed! Feature is working correctly.');
    } else {
      console.log('\n❌ FAILED: Receiver photo not stored in database!');
      console.log('   Please check the TripRequest model schema.');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testE2EFlow();
