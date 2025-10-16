const mongoose = require('mongoose');
const User = require('./models/userModel');
const TripRequest = require('./models/tripRequestModel');
require('dotenv').config();

async function createRequestForExistingUser() {
    try {
        console.log('🔄 Creating test request for existing user...\n');
        
        // Connect to database
        await mongoose.connect(process.env.MONGO_URI);
        console.log('📊 Connected to database');

        // Find the user that's currently logged in (from server logs)
        const activeUser = await User.findById('68aec993dbf01baee1da38aa');
        
        if (!activeUser) {
            console.log('❌ Active user not found in database');
            return;
        }

        console.log(`👤 Active User: ${activeUser.firstName} ${activeUser.lastName} (${activeUser.email})`);

        // Create another user as sender
        const senderUsers = await User.find({ _id: { $ne: activeUser._id } });
        
        if (senderUsers.length === 0) {
            console.log('❌ No other users found to act as sender');
            return;
        }

        const sender = senderUsers[0];
        console.log(`👤 Sender: ${sender.firstName} ${sender.lastName} (${sender.email})`);

        // Create a trip request where the active user is the receiver
        const newTripRequest = new TripRequest({
            tripReqId: `test-for-active-user-${Date.now()}`,
            user: {
                userId: sender._id.toString(),
                userName: `${sender.firstName} ${sender.lastName}`,
                userImage: sender.profilePhoto || sender.userImage || ""
            },
            startingLocation: {
                address: "Test Start Location - City Center",
                latitude: -33.8688,
                longitude: 151.2093
            },
            destination: "Test End Location - University",
            destinationType: "By Car",
            date: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
            time: "15:30",
            genderPreference: "any",
            recipients: [{
                userId: activeUser._id.toString(), // Active user as receiver
                userName: `${activeUser.firstName} ${activeUser.lastName}`,
                responseStatus: "notified"
            }],
            status: "pending",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            photo: {
                url: sender.profilePhoto || sender.userImage || "",
                filename: "",
                publicId: ""
            }
        });

        const savedRequest = await newTripRequest.save();
        console.log(`\n✅ Created test trip request: ${savedRequest.tripReqId}`);
        console.log(`   - From: ${sender.firstName} ${sender.lastName}`);
        console.log(`   - To: ${activeUser.firstName} ${activeUser.lastName}`);
        console.log(`   - Status: ${savedRequest.status}`);
        console.log(`   - Recipient Status: ${savedRequest.recipients[0].responseStatus}`);

        // Test the query that will be used by the API
        const testQuery = await TripRequest.find({
            "recipients.userId": activeUser._id.toString(),
            "recipients.responseStatus": { $in: ["notified", "viewed"] },
            status: "pending",
            expiresAt: { $gt: new Date() }
        });
        
        console.log(`\n🔍 API Query Test Result: ${testQuery.length} requests found`);
        
        if (testQuery.length > 0) {
            console.log('✅ SUCCESS! The new request will be returned by the API!');
            testQuery.forEach((req, index) => {
                console.log(`  ${index + 1}. Trip ID: ${req.tripReqId}`);
                console.log(`      From: ${req.user.userName}`);
                console.log(`      Destination: ${req.destination}`);
                console.log(`      Status: ${req.status}`);
            });
            
            console.log('\n🧪 Now test the frontend app - the user should see this request!');
        } else {
            console.log('❌ Something is wrong with the query...');
        }

        await mongoose.disconnect();
        console.log('\n🔚 Test completed');

    } catch (error) {
        console.error('❌ Error:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
}

createRequestForExistingUser();