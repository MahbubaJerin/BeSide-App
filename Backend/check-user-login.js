require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/userModel');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB\n');
    
    // Find lululemom user
    const lululemom = await User.findOne({ userName: 'lululemom' });
    
    if (!lululemom) {
      console.log('❌ lululemom user not found!');
      await mongoose.disconnect();
      process.exit(1);
    }
    
    console.log('👤 lululemom User Info:');
    console.log('='.repeat(60));
    console.log(`🆔 ID: ${lululemom._id}`);
    console.log(`📧 Email: ${lululemom.email}`);
    console.log(`📱 Mobile: ${lululemom.mobileNo}`);
    console.log(`✅ Verified: ${lululemom.verified}`);
    console.log(`💚 Active: ${lululemom.active}`);
    console.log(`📍 Has Location: ${!!lululemom.location}`);
    console.log('='.repeat(60));
    
    console.log('\n💡 To test notification, make sure:');
    console.log('   1. lululemom is logged in to the app');
    console.log('   2. The app is in the foreground or background (not killed)');
    console.log('   3. The app has network connection to backend');
    console.log('   4. JWT token is valid and not expired');
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
