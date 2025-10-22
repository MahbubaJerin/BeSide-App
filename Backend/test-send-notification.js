// Test script to create a trip request and send to nearby users
const mongoose = require('mongoose');
require('dotenv').config();

const TripRequest = require('./models/tripRequestModel');
const UserLocation = require('./models/userLocationModel');
const User = require('./models/userModel');

async function testNotificationFlow() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find lululemom as the receiver
    const receiverLocation = await UserLocation.findOne({
      userName: 'lululemom'
    });

    if (!receiverLocation) {
      console.log('❌ lululemom not found in UserLocation collection');
      console.log('� Searching for lululemom in Users collection...');
      
      const lululemomUser = await User.findOne({ userName: 'lululemom' });
      if (lululemomUser) {
        console.log('✅ Found lululemom in Users collection:', lululemomUser._id);
        console.log('⚠️ But lululemom has no location data. They need to enable location sharing in the app.');
      } else {
        console.log('❌ lululemom not found in database at all');
      }
      process.exit(1);
    }

    console.log('✅ Found lululemom in UserLocation');
    console.log('👤 Receiver: lululemom (', receiverLocation.userId, ')');
    console.log('� Receiver location:', {
      lat: receiverLocation.location.coordinates[1],
      lng: receiverLocation.location.coordinates[0]
    });

    // Get or create mock sender user
    let mockSenderUser = await User.findOne({ userName: 'MockSender' });
    
    if (!mockSenderUser) {
      console.log('\n📝 Creating mock sender user...');
      mockSenderUser = await User.create({
        userName: 'MockSender',
        email: 'mocksender@test.com',
        password: 'hashedpassword123',
        firstName: 'Mock',
        lastName: 'Sender',
        mobileNo: '+61400000000',
        address: {
          country: 'Australia',
          countryCode: 'AU'
        },
        isVerified: true,
        gender: 'male',
        profilePhoto: 'default.jpg'
      });
      console.log('✅ Mock sender created');
    } else {
      console.log('✅ Using existing mock sender');
    }

    console.log('👤 Sender: MockSender (', mockSenderUser._id, ')');

    // Create a test trip request with mock sender sending to lululemom
    const tripReqId = mockSenderUser.userName.slice(0, 3).toUpperCase() + Date.now();
    
    // Use lululemom's location (or nearby) as the start location
    const startLat = receiverLocation.location.coordinates[1];
    const startLng = receiverLocation.location.coordinates[0];
    
    console.log('\n📝 Creating trip request from MockSender to lululemom...');
    const tripRequest = await TripRequest.create({
      tripReqId,
      user: {
        userId: mockSenderUser._id.toString(),
        userName: mockSenderUser.userName,
        userImage: mockSenderUser.profilePhoto || "default.jpg"
      },
      startLocation: {
        latitude: startLat,
        longitude: startLng,
        address: "Melbourne CBD (Test)"
      },
      destination: "Federation Square",
      destinationType: "By Walk",
      date: new Date(),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      genderPreference: "any",
      routeCoordinates: [],
      transportMode: "walking",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      recipients: [{
        userId: receiverLocation.userId,
        userName: receiverLocation.userName,
        responseStatus: "notified",
        notifiedAt: new Date()
      }],
      photo: {
        url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        filename: "test-photo.jpg",
        publicId: "test-photo"
      }
    });

    console.log('✅ Trip request created:', tripReqId);
    console.log('📤 Recipient added: lululemom (', receiverLocation.userId, ')');
    console.log('📍 Start location:', startLat, ',', startLng);
    console.log('🎯 Destination: Federation Square');
    console.log('⏰ Expires at:', tripRequest.expiresAt);
    
    console.log('\n✅ SUCCESS! Trip request created and sent to lululemom!');
    console.log('\n📱 Now check lululemom\'s app - they should see a notification with:');
    console.log('   � Sender: MockSender');
    console.log('   📍 Destination: Federation Square');
    console.log('   🚶 Transport: By Walk');
    console.log('   🔔 Notification badge should appear!');
    console.log('\n👉 Trip Request ID:', tripReqId);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testNotificationFlow();
