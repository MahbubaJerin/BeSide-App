// Check what users exist in database
const mongoose = require('mongoose');
const User = require('./models/userModel');
require('dotenv').config();

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to database\n');

        const users = await User.find().select('userName email firstName lastName');
        
        console.log('📋 USERS IN DATABASE:');
        console.log('============================================================');
        console.log(`Total users: ${users.length}\n`);
        
        users.forEach((user, index) => {
            console.log(`${index + 1}. Username: ${user.userName}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Name: ${user.firstName} ${user.lastName}\n`);
        });
        
        console.log('============================================================');
        
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkUsers();
