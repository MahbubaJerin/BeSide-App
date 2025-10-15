// Test companion discovery with debugging
const mongoose = require('mongoose');
const UserLocation = require('./models/userLocationModel');
const User = require('./models/userModel');

// Connect to database
mongoose.connect(process.env.DATABASE || 'mongodb://zihansarowar:Zihansarowar@ac-gwbctwy-shard-00-00.fgfof3x.mongodb.net:27017,ac-gwbctwy-shard-00-01.fgfof3x.mongodb.net:27017,ac-gwbctwy-shard-00-02.fgfof3x.mongodb.net:27017/?replicaSet=atlas-6hex66-shard-0&ssl=true&authSource=admin&retryWrites=true&w=majority&appName=Cluster0')
  .then(() => {
    console.log('✅ Connected to MongoDB');
    testCompanionDiscovery();
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  });

async function testCompanionDiscovery() {
  try {
    console.log('\n🔍 TESTING COMPANION DISCOVERY');
    console.log('================================');
    
    // Get all users
    const allUsers = await User.find({}, { _id: 1, name: 1, email: 1, isVerified: 1, isActive: 1 }).limit(10);
    console.log(`👥 Total users in database: ${allUsers.length}`);
    allUsers.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - Verified: ${user.isVerified}, Active: ${user.isActive}`);
    });
    
    // Get all user locations
    console.log('\n📍 USER LOCATIONS:');
    const allLocations = await UserLocation.find({}).limit(10);
    console.log(`📍 Total locations in database: ${allLocations.length}`);
    
    allLocations.forEach(location => {
      console.log(`   - User: ${location.userId}`);
      console.log(`     Coordinates: [${location.location.coordinates[0]}, ${location.location.coordinates[1]}]`);
      console.log(`     Share Location: ${location.shareLocation}`);
      console.log(`     Visible to Others: ${location.visibleToOthers}`);
      console.log(`     Updated: ${location.updatedAt}`);
      console.log('');
    });
    
    // Test geospatial query
    if (allLocations.length > 0) {
      const testLocation = allLocations[0];
      console.log(`🎯 Testing geospatial query around: [${testLocation.location.coordinates[0]}, ${testLocation.location.coordinates[1]}]`);
      
      const nearbyUsers = await UserLocation.find({
        userId: { $ne: testLocation.userId },
        shareLocation: true,
        visibleToOthers: true,
        location: {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: testLocation.location.coordinates
            },
            $maxDistance: 500 // 500 meters
          }
        }
      });
      
      console.log(`🎯 Found ${nearbyUsers.length} nearby users within 500m`);
      nearbyUsers.forEach(user => {
        console.log(`   - User: ${user.userId}`);
      });
    }
    
    console.log('\n✅ Test complete');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}