// Test script to simulate both users arriving
const mongoose = require('mongoose');
const TripMatch = require('./models/tripMatchModel');

// Connect to MongoDB
const DB = "mongodb://zihansarowar:Zihansarowar@ac-gwbctwy-shard-00-00.fgfof3x.mongodb.net:27017,ac-gwbctwy-shard-00-01.fgfof3x.mongodb.net:27017,ac-gwbctwy-shard-00-02.fgfof3x.mongodb.net:27017/?replicaSet=atlas-6hex66-shard-0&ssl=true&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";

async function testTripStart() {
  try {
    await mongoose.connect(DB);
    console.log('🔌 Connected to MongoDB');

    // Get the most recent match
    const latestMatch = await TripMatch.findOne({}).sort({ createdAt: -1 });
    
    if (!latestMatch) {
      console.log('❌ No matches found');
      return;
    }

    console.log(`\n📋 Latest Match: ${latestMatch.matchId}`);
    console.log(`Current Status: ${latestMatch.status}`);
    console.log(`Arrived Users: ${latestMatch.arrivedUsers?.length || 0}`);
    console.log(`Started Users: ${latestMatch.startedUsers?.length || 0}`);

    // If both users have arrived but status is still ready-to-start, fix it
    if (latestMatch.arrivedUsers?.length >= 2 && latestMatch.status === 'ready-to-start') {
      console.log('\n🔧 Fixing match status...');
      
      latestMatch.status = 'final-journey';
      latestMatch.canStartFinalJourney = true;
      latestMatch.finalJourneyStartedAt = new Date();
      
      // Initialize and populate startedUsers
      if (!latestMatch.startedUsers) {
        latestMatch.startedUsers = [];
      }
      
      const organizerUserId = latestMatch.organizer.userId;
      const companionUserId = latestMatch.companion.userId;
      
      if (!latestMatch.startedUsers.includes(organizerUserId)) {
        latestMatch.startedUsers.push(organizerUserId);
      }
      if (!latestMatch.startedUsers.includes(companionUserId)) {
        latestMatch.startedUsers.push(companionUserId);
      }

      await latestMatch.save();
      
      console.log('✅ Match updated successfully!');
      console.log(`New Status: ${latestMatch.status}`);
      console.log(`Started Users: ${latestMatch.startedUsers?.length || 0}`);
    } else {
      console.log('ℹ️ No update needed');
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testTripStart();