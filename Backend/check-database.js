require('dotenv').config();
const mongoose = require('mongoose');
const TripRequest = require('./models/tripRequestModel');

console.log('🔗 Using MongoDB URI:', process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB\n');
    
    // Find all trip requests
    const requests = await TripRequest.find({}).sort({ createdAt: -1 }).limit(5);
    
    console.log('📋 Latest Trip Requests:', requests.length);
    console.log('='.repeat(60));
    
    requests.forEach(r => {
      console.log(`\n🆔 ID: ${r.tripReqId}`);
      console.log(`👤 Sender: ${r.user.userName} (${r.user.userId})`);
      console.log(`📍 Destination: ${r.dest?.name || 'N/A'}`);
      console.log(`👥 Recipients: ${r.recipients.length}`);
      r.recipients.forEach(rec => {
        console.log(`   - ${rec.userName} (${rec.userId}) [${rec.responseStatus}]`);
      });
      console.log(`⏰ Created: ${r.createdAt}`);
      console.log(`⏰ Expires: ${r.expiresAt}`);
      console.log(`❌ Is Expired: ${new Date() > new Date(r.expiresAt)}`);
    });
    
    console.log('\n' + '='.repeat(60));
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
