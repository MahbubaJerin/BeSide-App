// Quick script to check active users in database
const UserLocation = require('./models/userLocationModel');
const mongoose = require('mongoose');
require('dotenv').config();

async function checkActiveUsers() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');

    const timeWindow = 15; // minutes
    const cutoffTime = new Date(Date.now() - timeWindow * 60 * 1000);

    // Get all users with recent activity
    const allUsers = await UserLocation.find({
      lastSeen: { $gte: cutoffTime }
    }).select('userId userName isActive shareLocation visibleToOthers lastSeen location');

    // Get discoverable users
    const discoverableUsers = await UserLocation.find({
      isActive: true,
      shareLocation: true,
      visibleToOthers: true,
      lastSeen: { $gte: cutoffTime }
    }).select('userId userName lastSeen location');

    console.log(`\n📊 ACTIVE USERS REPORT (Last ${timeWindow} minutes)`);
    console.log('='.repeat(60));
    console.log(`Total users with activity: ${allUsers.length}`);
    console.log(`Discoverable users: ${discoverableUsers.length}`);
    console.log('='.repeat(60));

    if (allUsers.length === 0) {
      console.log('\n⚠️ No active users found in the last 15 minutes');
      console.log('   This means no users have sent location updates recently');
      console.log('   Check if location tracking is working on the frontend\n');
    } else {
      console.log('\n📋 User Details:');
      allUsers.forEach((user, index) => {
        const minutesAgo = Math.round((Date.now() - new Date(user.lastSeen).getTime()) / 60000);
        const [lng, lat] = user.location.coordinates;
        console.log(`\n${index + 1}. ${user.userName}`);
        console.log(`   - Active: ${user.isActive}`);
        console.log(`   - Share Location: ${user.shareLocation}`);
        console.log(`   - Visible to Others: ${user.visibleToOthers}`);
        console.log(`   - Last Seen: ${minutesAgo} minute(s) ago`);
        console.log(`   - Location: [${lat.toFixed(6)}, ${lng.toFixed(6)}]`);
        console.log(`   - Discoverable: ${user.isActive && user.shareLocation && user.visibleToOthers ? '✅ YES' : '❌ NO'}`);
      });

      if (discoverableUsers.length > 0) {
        console.log(`\n✅ Discoverable users: ${discoverableUsers.map(u => u.userName).join(', ')}`);
      } else {
        console.log('\n⚠️ No discoverable users found!');
        console.log('   Users are updating location but visibility flags are not set correctly');
      }
    }

    console.log('\n' + '='.repeat(60));
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkActiveUsers();
