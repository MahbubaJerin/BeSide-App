const mongoose = require('mongoose');
const User = require('./models/userModel');
const TripRequest = require('./models/tripRequestModel');

// Create a proper test trip request
async function createTestRequest() {
    try {
        console.log('🔄 Creating test trip request...\n');

        // Load environment variables
        require('dotenv').config();
        
        // Connect to database directly to check data
        await mongoose.connect(process.env.MONGO_URI);
        console.log('📊 Connected to database');

        // Get existing users
        const existingUsers = await User.find({});
        console.log(`👥 Found ${existingUsers.length} users in DB`);
        
        if (existingUsers.length < 2) {
            console.log('❌ Need at least 2 users to create test request');
            await mongoose.disconnect();
            return;
        }

        const sender = existingUsers[0];
        
        // Find the test receiver we just created
        const receiver = await User.findOne({ email: 'test-receiver@example.com' });
        
        if (!receiver) {
            console.log('❌ Test receiver not found. Please run the API test first.');
            await mongoose.disconnect();
            return;
        }
        
        console.log(`\n👤 Sender: ${sender.firstName} ${sender.lastName} (${sender.email})`);
        console.log(`👤 Receiver: ${receiver.firstName} ${receiver.lastName} (${receiver.email})`);

        // Create a new trip request with proper structure for notification system
        const newTripRequest = new TripRequest({
            tripReqId: `test-${Date.now()}`,
            user: {
                userId: sender._id.toString(),
                userName: `${sender.firstName} ${sender.lastName}`,
                userImage: sender.profilePhoto || sender.userImage || ""
            },
            startingLocation: {
                address: "Test Start Location - Downtown",
                latitude: -33.8688,  // Sydney CBD coordinates
                longitude: 151.2093
            },
            destination: "Test End Location - Airport",
            destinationType: "By Car",
            date: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
            time: "14:30",
            genderPreference: "any",
            recipients: [{
                userId: receiver._id.toString(),
                userName: `${receiver.firstName} ${receiver.lastName}`,
                responseStatus: "notified" // This is key for getPendingRequests
            }],
            status: "pending", // This is key for getPendingRequests
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            photo: {
                url: sender.profilePhoto || sender.userImage || "",
                filename: "",
                publicId: ""
            }
        });

        const savedRequest = await newTripRequest.save();
        console.log(`\n✅ Created test trip request: ${savedRequest.tripReqId}`);
        console.log(`   - Status: ${savedRequest.status}`);
        console.log(`   - Recipients: ${savedRequest.recipients.length}`);
        console.log(`   - Recipient Status: ${savedRequest.recipients[0].responseStatus}`);

        // Test the getPendingRequests logic with the new request
        console.log(`\n🔍 Testing getPendingRequests query for receiver...`);
        
        const testQuery = await TripRequest.find({
            "recipients.userId": receiver._id.toString(),
            "recipients.responseStatus": { $in: ["notified", "viewed"] },
            status: "pending",
            expiresAt: { $gt: new Date() }
        });
        
        console.log(`📋 Query result: ${testQuery.length} requests found`);
        
        if (testQuery.length > 0) {
            console.log('✅ SUCCESS! Test request was found by getPendingRequests query');
            testQuery.forEach((req, index) => {
                console.log(`  ${index + 1}. Trip ID: ${req.tripReqId}`);
                console.log(`      From: ${req.user.userName} (${req.user.userId})`);
                console.log(`      Location: ${req.from} → ${req.to}`);
                console.log(`      Status: ${req.status}`);
                console.log(`      Expires: ${req.expiresAt}`);
            });
        } else {
            console.log('❌ Test request was NOT found by getPendingRequests query');
        }

        // Disconnect from database
        await mongoose.disconnect();
        console.log('\n🔚 Test completed');

    } catch (error) {
        console.error('❌ Error creating test request:', error.message);
        console.error('Full error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

createTestRequest();