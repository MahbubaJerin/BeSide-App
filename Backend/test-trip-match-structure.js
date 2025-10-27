// Test script to check trip match structure
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const TripMatch = require('./models/tripMatchModel');

async function testTripMatchStructure() {
  try {
    console.log('🔍 Checking trip match structure...');
    
    // Find the most recent trip match
    const latestMatch = await TripMatch.findOne().sort({ createdAt: -1 });
    
    if (latestMatch) {
      console.log('\n📋 Latest Trip Match Structure:');
      console.log('- matchId:', latestMatch.matchId);
      console.log('- status:', latestMatch.status);
      console.log('- meetingPoint exists:', !!latestMatch.meetingPoint);
      console.log('- meetingPoint.location exists:', !!latestMatch.meetingPoint?.location);
      console.log('- tripDetails exists:', !!latestMatch.tripDetails);
      console.log('- tripDetails.destinationLocation exists:', !!latestMatch.tripDetails?.destinationLocation);
      
      if (latestMatch.meetingPoint?.location) {
        console.log('- meetingPoint.location:', {
          lat: latestMatch.meetingPoint.location.latitude,
          lng: latestMatch.meetingPoint.location.longitude
        });
      }
      
      if (latestMatch.tripDetails?.destinationLocation) {
        console.log('- destinationLocation:', {
          lat: latestMatch.tripDetails.destinationLocation.latitude,
          lng: latestMatch.tripDetails.destinationLocation.longitude
        });
      }
      
      console.log('\n🔍 Full meetingPoint structure:');
      console.log(JSON.stringify(latestMatch.meetingPoint, null, 2));
      
      console.log('\n🔍 Full tripDetails structure:');
      console.log(JSON.stringify(latestMatch.tripDetails, null, 2));
      
    } else {
      console.log('❌ No trip matches found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

testTripMatchStructure();