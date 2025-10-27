// Backend/test-flow-debug.js
const mongoose = require('mongoose');
const TripMatch = require('./models/tripMatchModel');

async function testFlowDebug() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://zihansarowar:Zihansarowar@ac-gwbctwy-shard-00-00.fgfof3x.mongodb.net:27017,ac-gwbctwy-shard-00-01.fgfof3x.mongodb.net:27017,ac-gwbctwy-shard-00-02.fgfof3x.mongodb.net:27017/?replicaSet=atlas-6hex66-shard-0&ssl=true&authSource=admin&retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB');

    // Find latest match
    const latestMatch = await TripMatch.findOne().sort({ createdAt: -1 });
    
    if (!latestMatch) {
      console.log('No matches found');
      return;
    }

    console.log('\n=== LATEST MATCH DEBUG ===');
    console.log('Match ID:', latestMatch.matchId);
    console.log('Status:', latestMatch.status);
    console.log('Both Arrived:', latestMatch.arrivedUsers?.length >= 2);
    console.log('Trip Started:', latestMatch.tripStarted);
    console.log('Arrived Users:', latestMatch.arrivedUsers);
    
    console.log('\n=== STRUCTURE CHECK ===');
    console.log('Meeting Point:', latestMatch.meetingPoint?.location);
    console.log('Destination:', latestMatch.tripDetails?.destinationLocation);
    
    console.log('\n=== ACTIVE MATCHES CHECK ===');
    // Test what findUserActiveMatches returns for both users
    const organizerMatches = await TripMatch.findUserActiveMatches(latestMatch.organizer.userId);
    const companionMatches = await TripMatch.findUserActiveMatches(latestMatch.companion.userId);
    
    console.log('Organizer active matches:', organizerMatches.length);
    console.log('Companion active matches:', companionMatches.length);
    
    if (organizerMatches.length > 0) {
      console.log('Organizer match status:', organizerMatches[0].status);
    }
    if (companionMatches.length > 0) {
      console.log('Companion match status:', companionMatches[0].status);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

testFlowDebug();