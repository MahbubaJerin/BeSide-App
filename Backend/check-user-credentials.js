const mongoose = require('mongoose');
const User = require('./models/userModel');

async function checkUserCredentials() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://MahbubaJerin:ATMahbuba1253@cluster0.yqwj4.mongodb.net/BeSideDB', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('🔗 Connected to MongoDB Atlas');

    // Find lululemom user
    const user = await User.findOne({ userName: 'lululemom' });
    
    if (user) {
      console.log('\n👤 Lululemom User Found:');
      console.log('   - User ID:', user.userId);
      console.log('   - Username:', user.userName);
      console.log('   - Email:', user.email);
      console.log('   - Phone:', user.phoneNumber);
      console.log('   - Created:', user.createdAt);
      console.log('\n📧 Login Instructions:');
      console.log('   Use either email or username: lululemom');
      console.log('   Email option:', user.email);
      console.log('\n⚠️  Note: Password is hashed, you\'ll need the original password');
    } else {
      console.log('❌ Lululemom user not found');
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkUserCredentials();