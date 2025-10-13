// Quick script to check lululemom user situation
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/userModel');
const UserLocation = require('./models/userLocationModel');

async function checkLululemom() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find all users with lululemom in username
    console.log("\n🔍 Searching for lululemom users:");
    const users = await User.find({ userName: { $regex: /lululemom/i } });
    console.log("Found users:", users.map(u => ({ id: u._id, userName: u.userName, isVerified: u.isVerified })));

    // Find location records for lululemom
    console.log("\n📍 Location records for lululemom:");
    const locations = await UserLocation.find({ userName: { $regex: /lululemom/i } });
    console.log("Found locations:", locations.map(l => ({ 
      id: l._id, 
      userId: l.userId, 
      userName: l.userName, 
      isActive: l.isActive,
      coordinates: l.location.coordinates 
    })));

    // Check if we can find user by the ID in location record
    if (locations.length > 0) {
      const locationUserId = locations[0].userId;
      console.log(`\n🔍 Checking if user with ID ${locationUserId} exists:`);
      const userById = await User.findById(locationUserId);
      console.log("User found by ID:", userById ? { id: userById._id, userName: userById.userName } : "NOT FOUND");
    }

    // List all users to see pattern
    console.log("\n📋 All users in database:");
    const allUsers = await User.find({}, { userName: 1, _id: 1 }).limit(10);
    allUsers.forEach(user => {
      console.log(`  - ${user.userName}: ${user._id}`);
    });

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
}

checkLululemom();