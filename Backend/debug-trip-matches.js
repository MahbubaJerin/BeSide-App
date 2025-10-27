// Debug script to check trip matches in database
const mongoose = require('mongoose');
const TripMatch = require('./models/tripMatchModel');
const TripRequest = require('./models/tripRequestModel');
const User = require('./models/userModel');

// Connect to MongoDB
const DB = "mongodb://zihansarowar:Zihansarowar@ac-gwbctwy-shard-00-00.fgfof3x.mongodb.net:27017,ac-gwbctwy-shard-00-01.fgfof3x.mongodb.net:27017,ac-gwbctwy-shard-00-02.fgfof3x.mongodb.net:27017/?replicaSet=atlas-6hex66-shard-0&ssl=true&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";

async function debugDatabase() {
  try {
    await mongoose.connect(DB);
    console.log('🔌 Connected to MongoDB');

    // Check all trip matches
    console.log('\n📋 === TRIP MATCHES ===');
    const tripMatches = await TripMatch.find({}).sort({ createdAt: -1 }).limit(10);
    console.log(`Found ${tripMatches.length} trip matches:`);
    
    tripMatches.forEach((match, index) => {
      console.log(`\n${index + 1}. Match ID: ${match.matchId}`);
      console.log(`   Status: ${match.status}`);
      console.log(`   Organizer: ${match.organizer?.userName || 'Unknown'} (${match.organizer?.userId})`);
      console.log(`   Companion: ${match.companion?.userName || 'Unknown'} (${match.companion?.userId})`);
      console.log(`   Arrived Users: ${match.arrivedUsers?.length || 0} ${match.arrivedUsers ? `[${match.arrivedUsers.join(', ')}]` : ''}`);
      console.log(`   Created: ${match.createdAt}`);
    });

    // Check trip requests
    console.log('\n📋 === TRIP REQUESTS ===');
    const tripRequests = await TripRequest.find({}).sort({ createdAt: -1 }).limit(5);
    console.log(`Found ${tripRequests.length} trip requests:`);
    
    tripRequests.forEach((request, index) => {
      console.log(`\n${index + 1}. Request ID: ${request._id}`);
      console.log(`   Status: ${request.status}`);
      console.log(`   User: ${request.user?.userName || 'Unknown'} (${request.user?.userId})`);
      console.log(`   From: ${request.from?.address || 'Unknown'}`);
      console.log(`   To: ${request.to?.address || 'Unknown'}`);
      console.log(`   Expires: ${request.expiresAt}`);
    });

    // Check users
    console.log('\n👥 === RECENT USERS ===');
    const users = await User.find({}).sort({ lastActive: -1 }).limit(5);
    console.log(`Found ${users.length} users:`);
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. User: ${user.userName} (${user._id})`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Last Active: ${user.lastActive || 'Never'}`);
    });

  } catch (error) {
    console.error('❌ Database debug error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

debugDatabase();