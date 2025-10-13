// Debug script to check MongoDB data
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const User = require('./models/userModel');
const UserLocation = require('./models/userLocationModel');
const TripRequest = require('./models/tripRequestModel');

async function debugDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    console.log("\n=== DATABASE DEBUG REPORT ===\n");

    // 1. Check Users
    console.log("👥 USERS:");
    const users = await User.find({}, { userName: 1, _id: 1, isVerified: 1 }).limit(5);
    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`  - ${user.userName} (ID: ${user._id}) - Verified: ${user.isVerified}`);
    });

    // 2. Check User Locations
    console.log("\n📍 USER LOCATIONS:");
    const locations = await UserLocation.find({}, { 
      userId: 1, 
      userName: 1, 
      location: 1, 
      isActive: 1, 
      lastSeen: 1 
    }).limit(5).sort({ lastSeen: -1 });
    console.log(`Found ${locations.length} location records:`);
    locations.forEach(loc => {
      console.log(`  - ${loc.userName}: [${loc.location.coordinates[1]}, ${loc.location.coordinates[0]}] - Active: ${loc.isActive} - Last seen: ${loc.lastSeen}`);
    });

    // 3. Check Trip Requests
    console.log("\n🚗 TRIP REQUESTS:");
    const tripRequests = await TripRequest.find({}).limit(10).sort({ createdAt: -1 });
    console.log(`Found ${tripRequests.length} trip requests:`);
    tripRequests.forEach(req => {
      console.log(`  - ${req.tripReqId} by ${req.user.userName}:`);
      console.log(`    Status: ${req.status}`);
      console.log(`    Recipients: ${req.recipients.length}`);
      console.log(`    Created: ${req.createdAt}`);
      console.log(`    Expires: ${req.expiresAt}`);
      req.recipients.forEach(recipient => {
        console.log(`      → ${recipient.userName} (${recipient.responseStatus})`);
      });
    });

    // 4. Test nearby users query
    console.log("\n🔍 TESTING NEARBY USERS QUERY:");
    if (locations.length > 0) {
      const testLocation = locations[0];
      const coords = testLocation.location.coordinates;
      console.log(`Testing near: [${coords[1]}, ${coords[0]}]`);
      
      const nearbyUsers = await UserLocation.findNearbyUsers(
        coords[0], // longitude
        coords[1], // latitude
        1000, // 1km radius for testing
        testLocation.userId
      );
      console.log(`Found ${nearbyUsers.length} nearby users:`);
      nearbyUsers.forEach(user => {
        console.log(`  - ${user.userName} (Active: ${user.isActive})`);
      });
    }

    console.log("\n=== END DEBUG REPORT ===\n");

  } catch (error) {
    console.error("❌ Database debug error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
}

// Run the debug
debugDatabase();