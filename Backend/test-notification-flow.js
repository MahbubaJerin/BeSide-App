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
        const receiver = existingUsers[1];
        
        console.log(`\n👤 Sender: ${sender.firstName} ${sender.lastName} (${sender.email})`);
        console.log(`👤 Receiver: ${receiver.firstName} ${receiver.lastName} (${receiver.email})`);

        // Create a new trip request with proper structure for notification system
        const newTripRequest = new TripRequest({
            tripReqId: `test-${Date.now()}`,
            user: {
                userId: sender._id.toString(),
                userName: `${sender.firstName} ${sender.lastName}`,
                userImage: sender.profilePhoto || sender.userImage || null
            },
            recipients: [{
                userId: receiver._id.toString(),
                responseStatus: "notified", // This is key for getPendingRequests
                respondedAt: null
            }],
            from: "Test Start Location - Downtown",
            to: "Test End Location - Airport",
            startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
            maxUsers: 3,
            notes: "Test trip request for notification debugging",
            status: "pending", // This is key for getPendingRequests
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            createdAt: new Date(),
            photo: {
                url: sender.profilePhoto || sender.userImage || null
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

// Direct database inspection
async function inspectDatabase() {
    try {
        console.log('🔄 Inspecting database...\n');

        // Load environment variables
        require('dotenv').config();
        
        // Connect to database directly to check data
        await mongoose.connect(process.env.MONGO_URI);
        console.log('📊 Connected to database');

        // Check existing trip requests
        const existingRequests = await TripRequest.find({});
        console.log(`\n📋 Total trip requests in DB: ${existingRequests.length}`);
        
        if (existingRequests.length > 0) {
            console.log('\n📝 All trip requests:');
            existingRequests.forEach((req, index) => {
                console.log(`  ${index + 1}. ID: ${req._id}`);
                console.log(`      From: ${req.senderId} → To: ${req.recipientId}`);
                console.log(`      Status: ${req.status}`);
                console.log(`      Location: ${req.from} → ${req.to}`);
                console.log(`      Created: ${req.createdAt}`);
                console.log(`      ---`);
            });

            // Check for pending requests specifically
            const pendingRequests = await TripRequest.find({ status: 'pending' });
            console.log(`\n⏳ Pending requests: ${pendingRequests.length}`);
            
            if (pendingRequests.length > 0) {
                console.log('📝 Pending requests details:');
                pendingRequests.forEach((req, index) => {
                    console.log(`  ${index + 1}. From: ${req.senderId} → To: ${req.recipientId}`);
                    console.log(`      Location: ${req.from} → ${req.to}`);
                });
            }
        }

        // Check existing users
        const existingUsers = await User.find({});
        console.log(`\n👥 Total users in DB: ${existingUsers.length}`);
        
        if (existingUsers.length > 0) {
            console.log('\n📝 Sample users:');
            existingUsers.slice(0, 5).forEach((user, index) => {
                console.log(`  ${index + 1}. ID: ${user._id}`);
                console.log(`      Email: ${user.email}`);
                console.log(`      Name: ${user.firstName} ${user.lastName}`);
                console.log(`      Photo: ${user.profilePhoto ? 'Yes' : 'No'}`);
                console.log(`      ---`);
            });
        }

        // Test the getPendingRequests logic manually
        if (existingUsers.length > 0) {
            const testUser = existingUsers[0];
            console.log(`\n🔍 Testing pending requests for user: ${testUser.email} (ID: ${testUser._id})`);
            
            // Simulate the exact query from notificationController
            const userPendingRequests = await TripRequest.find({
                recipientId: testUser._id.toString(),
                status: 'pending'
            });
            
            console.log(`� Raw pending requests for this user: ${userPendingRequests.length}`);
            
            if (userPendingRequests.length > 0) {
                console.log('📝 Details:');
                userPendingRequests.forEach((req, index) => {
                    console.log(`  ${index + 1}. From: ${req.senderId}`);
                    console.log(`      Location: ${req.from} → ${req.to}`);
                    console.log(`      Status: ${req.status}`);
                });
            }
        }

        // Disconnect from database
        await mongoose.disconnect();
        console.log('\n🔚 Database inspection completed');

    } catch (error) {
        console.error('❌ Error in database inspection:', error.message);
        console.error('Full error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

createTestRequest();