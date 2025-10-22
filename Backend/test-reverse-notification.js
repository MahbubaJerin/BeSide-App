require('dotenv').config();
const mongoose = require('mongoose');
const TripRequest = require('./models/tripRequestModel');
const UserLocation = require('./models/userLocationModel');
const User = require('./models/userModel');

console.log('🔄 REVERSE FLOW TEST: lululemom → nammu\n');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB\n');
    
    // Find both users in UserLocation
    const lululemomLocation = await UserLocation.findOne({ userName: 'lululemom' });
    const nammuLocation = await UserLocation.findOne({ userName: 'nammu' });
    
    if (!lululemomLocation) {
      console.log('❌ lululemom not found in UserLocation!');
      await mongoose.disconnect();
      process.exit(1);
    }
    
    if (!nammuLocation) {
      console.log('❌ nammu not found in UserLocation!');
      await mongoose.disconnect();
      process.exit(1);
    }
    
    console.log('✅ Found both users in UserLocation');
    console.log('👤 Sender: lululemom (', lululemomLocation._id, ')');
    console.log('📍 Sender location:', {
      lat: lululemomLocation.location.coordinates[1],
      lng: lululemomLocation.location.coordinates[0]
    });
    console.log('\n👤 Receiver: nammu (', nammuLocation._id, ')');
    console.log('📍 Receiver location:', {
      lat: nammuLocation.location.coordinates[1],
      lng: nammuLocation.location.coordinates[0]
    });
    
    // Get the full User documents
    const lululemomUser = await User.findById(lululemomLocation._id);
    const nammuUser = await User.findById(nammuLocation._id);
    
    if (!lululemomUser || !nammuUser) {
      console.log('❌ User documents not found!');
      await mongoose.disconnect();
      process.exit(1);
    }
    
    console.log('\n📝 Creating trip request from lululemom to nammu...');
    
    // Create trip request from lululemom to nammu
    const tripReqId = 'LUL' + Date.now();
    const tripRequest = await TripRequest.create({
      tripReqId,
      user: {
        userId: lululemomUser._id,
        userName: lululemomUser.userName,
        userImage: lululemomUser.userImage || 'default.jpg'
      },
      destination: 'Queen Victoria Market',
      destinationType: 'By Walk',
      date: new Date(),
      time: '11:00 PM',
      genderPreference: 'any',
      status: 'pending',
      startLocation: {
        address: 'Melbourne CBD (lululemom location)',
        latitude: lululemomLocation.location.coordinates[1],
        longitude: lululemomLocation.location.coordinates[0]
      },
      photo: {
        url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        filename: 'test-photo-lululemom.jpg',
        publicId: 'test-photo-lululemom'
      },
      recipients: [{
        userId: nammuUser._id,
        userName: nammuUser.userName,
        notifiedAt: new Date(),
        responseStatus: 'notified'
      }],
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      searchDuration: 30 * 60 * 1000,
      transportMode: 'walking',
      routeCoordinates: []
    });
    
    console.log('\n✅ SUCCESS! Trip request created:', tripReqId);
    console.log('📤 Recipient added: nammu (', nammuUser._id, ')');
    console.log('📍 Destination: Queen Victoria Market');
    console.log('🚶 Transport: By Walk');
    console.log('⏰ Expires:', tripRequest.expiresAt.toISOString());
    console.log('\n' + '='.repeat(60));
    console.log('🎯 NOW TEST: Log in as nammu and check for notification!');
    console.log('   - Sender: lululemom');
    console.log('   - Destination: Queen Victoria Market');
    console.log('   - Transport: By Walk');
    console.log('='.repeat(60));
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
