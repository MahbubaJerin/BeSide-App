// Check all trip matches to understand the current state
const mongoose = require('mongoose');
const TripMatch = require('./models/tripMatchModel');
const TripRequest = require('./models/tripRequestModel');

mongoose.connect(process.env.DATABASE || 'mongodb://zihansarowar:Zihansarowar@ac-gwbctwy-shard-00-00.fgfof3x.mongodb.net:27017,ac-gwbctwy-shard-00-01.fgfof3x.mongodb.net:27017,ac-gwbctwy-shard-00-02.fgfof3x.mongodb.net:27017/?replicaSet=atlas-6hex66-shard-0&ssl=true&authSource=admin&retryWrites=true&w=majority&appName=Cluster0')
  .then(() => {
    console.log('✅ Connected to MongoDB');
    checkAllMatches();
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  });

async function checkAllMatches() {
  try {
    console.log('\n🔍 CHECKING ALL TRIP DATA');
    console.log('========================');
    
    // Get all trip matches (any status)
    const allMatches = await TripMatch.find({});
    console.log(`📋 Total trip matches found: ${allMatches.length}`);
    
    if (allMatches.length > 0) {
      allMatches.forEach((match, index) => {
        console.log(`\n🚀 MATCH ${index + 1}:`);
        console.log(`   ID: ${match.matchId}`);
        console.log(`   Status: ${match.status}`);
        console.log(`   Organizer: ${match.organizer.userName}`);
        console.log(`   Companion: ${match.companion.userName}`);
        console.log(`   Meeting Point: ${match.meetingPoint ? 'SET' : 'NOT SET'}`);
        if (match.meetingPoint) {
          console.log(`   Meeting Location: ${JSON.stringify(match.meetingPoint.location)}`);
          console.log(`   Meeting Name: ${match.meetingPoint.name}`);
        }
      });
    }
    
    // Get all trip requests
    const allRequests = await TripRequest.find({}).limit(5);
    console.log(`\n📋 Total trip requests found: ${allRequests.length}`);
    
    if (allRequests.length > 0) {
      allRequests.forEach((request, index) => {
        console.log(`\n📝 REQUEST ${index + 1}:`);
        console.log(`   ID: ${request.tripReqId}`);
        console.log(`   Status: ${request.status}`);
        console.log(`   User: ${request.user.userName}`);
        console.log(`   Accepted By: ${request.acceptedBy?.userName || 'None'}`);
        console.log(`   Meeting Point: ${request.meetingPoint?.address || 'Not set'}`);
      });
    }
    
    console.log('\n💡 TESTING SUGGESTIONS:');
    console.log('1. Create a new trip request from the app');
    console.log('2. Accept it with another user to create a match');
    console.log('3. Set a meeting point');
    console.log('4. Then test the navigation feature');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    process.exit(1);
  }
}