// Quick test to check current active matches and navigation readiness
const mongoose = require('mongoose');
const TripMatch = require('./models/tripMatchModel');
const TripRequest = require('./models/tripRequestModel');

// Connect to database
mongoose.connect(process.env.DATABASE || 'mongodb://zihansarowar:Zihansarowar@ac-gwbctwy-shard-00-00.fgfof3x.mongodb.net:27017,ac-gwbctwy-shard-00-01.fgfof3x.mongodb.net:27017,ac-gwbctwy-shard-00-02.fgfof3x.mongodb.net:27017/?replicaSet=atlas-6hex66-shard-0&ssl=true&authSource=admin&retryWrites=true&w=majority&appName=Cluster0')
  .then(() => {
    console.log('✅ Connected to MongoDB');
    checkNavigationReadiness();
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  });

async function checkNavigationReadiness() {
  try {
    console.log('\n🗺️ CHECKING NAVIGATION READINESS');
    console.log('=================================');
    
    // Get active matches
    const activeMatches = await TripMatch.find({ 
      status: { $in: ['active', 'in-progress'] } 
    });
    
    console.log(`📋 Found ${activeMatches.length} active matches`);
    
    if (activeMatches.length > 0) {
      activeMatches.forEach((match, index) => {
        console.log(`\n🚀 MATCH ${index + 1}: ${match.matchId}`);
        console.log(`   Status: ${match.status}`);
        console.log(`   Organizer: ${match.organizer.userName} (${match.organizer.userId})`);
        console.log(`   Companion: ${match.companion.userName} (${match.companion.userId})`);
        
        // Check if meeting point is set
        if (match.meetingPoint && match.meetingPoint.location) {
          console.log(`   ✅ Meeting Point: ${match.meetingPoint.name || 'Set'}`);
          console.log(`   📍 Coordinates: [${match.meetingPoint.location.longitude}, ${match.meetingPoint.location.latitude}]`);
          console.log(`   🧭 NAVIGATION READY! ✨`);
        } else {
          console.log(`   ❌ Meeting Point: Not set`);
          console.log(`   📝 Need to set meeting point first`);
        }
        
        // Check trip details
        if (match.tripDetails && match.tripDetails.startLocation) {
          console.log(`   🏁 Start Location: [${match.tripDetails.startLocation.longitude}, ${match.tripDetails.startLocation.latitude}]`);
          console.log(`   🎯 Destination: ${match.tripDetails.destination}`);
        }
      });
      
      console.log('\n🎯 TO TEST NAVIGATION:');
      console.log('1. Open app and go to Active Matches');
      console.log('2. Look for "🧭 Navigate to Meeting" button');
      console.log('3. Tap it to see route preview');
      console.log('4. Tap "Start Navigation" to open Google Maps');
      console.log('5. Follow directions and test arrival detection!');
      
    } else {
      console.log('\n📝 No active matches found. To test navigation:');
      console.log('1. Create a trip request');
      console.log('2. Get someone to accept it');
      console.log('3. Set a meeting point');  
      console.log('4. Then navigation will be available!');
    }
    
    console.log('\n✅ Navigation system is ready and waiting!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    process.exit(1);
  }
}
