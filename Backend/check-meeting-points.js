const mongoose = require('mongoose');
const TripRequest = require('./models/tripRequestModel');

mongoose.connect('mongodb+srv://zihan:David070302@beside.m0lrr.mongodb.net/BeSide?retryWrites=true&w=majority&appName=BeSide')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Check for trip requests without meeting points
    const emptyMeetingPoints = await TripRequest.find({
      $or: [
        { 'meetingPoint.latitude': { $exists: false } },
        { 'meetingPoint.latitude': null },
        { 'meetingPoint.latitude': 0 }
      ]
    });
    
    console.log(`Trip requests without meeting points: ${emptyMeetingPoints.length}`);
    
    if (emptyMeetingPoints.length > 0) {
      console.log('\nFirst one:');
      console.log(JSON.stringify(emptyMeetingPoints[0], null, 2));
    }
    
    // Check all trip requests with meeting points
    const withMeetingPoints = await TripRequest.find({
      'meetingPoint.latitude': { $exists: true, $ne: null, $ne: 0 }
    });
    
    console.log(`\nTrip requests WITH meeting points: ${withMeetingPoints.length}`);
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });