const mongoose = require('mongoose');
const TripRequest = require('./models/tripRequestModel');

async function testLululemomRequests() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://MahbubaJerin:ATMahbuba1253@cluster0.yqwj4.mongodb.net/BeSideDB', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('🔗 Connected to MongoDB Atlas');

    // Find requests where lululemom is a recipient
    const requests = await TripRequest.find({
      'recipients.userId': '68e759d8f9f31255ca6a7cc4',
      status: 'pending',
      expiresAt: { $gt: new Date() }
    }).populate('user', 'userName userId userImage');

    console.log('\n📋 Active requests for lululemom:');
    console.log('   - Total found:', requests.length);
    
    if (requests.length > 0) {
      requests.forEach((request, index) => {
        console.log(`\n📝 Request ${index + 1}:`);
        console.log('   - Trip ID:', request.tripReqId);
        console.log('   - From user:', request.user.userName);
        console.log('   - Status:', request.status);
        console.log('   - Created:', request.createdAt);
        console.log('   - Expires:', request.expiresAt);
        console.log('   - Recipients:', request.recipients.map(r => `${r.userName} (${r.responseStatus})`));
      });
    } else {
      console.log('   ❌ No active requests found for lululemom');
    }

    // Also check if there are any expired requests
    const expiredRequests = await TripRequest.find({
      'recipients.userId': '68e759d8f9f31255ca6a7cc4',
      status: 'pending',
      expiresAt: { $lt: new Date() }
    });

    if (expiredRequests.length > 0) {
      console.log('\n⏰ Expired requests for lululemom:', expiredRequests.length);
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testLululemomRequests();