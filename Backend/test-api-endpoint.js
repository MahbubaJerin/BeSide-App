const mongoose = require('mongoose');
require('dotenv').config();

// Test the API endpoint directly
async function testPendingRequestsAPI() {
    try {
        console.log('🧪 Testing pending requests API...\n');

        // Register receiver and get token
        const response = await fetch('http://localhost:5000/api/v1/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                firstName: 'Test',
                lastName: 'Receiver',
                email: 'receiver@test.com',
                password: 'testpass123',
                age: 25,
                gender: 'female',
                university: 'Test University'
            })
        });

        let receiverToken;
        let receiverData;

        if (response.status === 400) {
            // User already exists, try login
            console.log('📝 User exists, logging in...');
            const loginResponse = await fetch('http://localhost:5000/api/v1/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'receiver@test.com',
                    password: 'testpass123'
                })
            });
            
            const loginResult = await loginResponse.json();
            if (loginResult.status === 'success') {
                receiverToken = loginResult.token;
                receiverData = loginResult.user;
                console.log('✅ Login successful');
            } else {
                console.log('❌ Login failed:', loginResult.message);
                return;
            }
        } else {
            const result = await response.json();
            if (result.status === 'success') {
                receiverToken = result.token;
                receiverData = result.user;
                console.log('✅ Registration successful');
            } else {
                console.log('❌ Registration failed:', result.message);
                return;
            }
        }

        console.log(`👤 Receiver: ${receiverData.firstName} ${receiverData.lastName} (${receiverData.email})`);

        // Test pending requests endpoint
        console.log('\n📬 Testing pending requests endpoint...');
        
        const pendingResponse = await fetch('http://localhost:5000/api/v1/trip/pending-requests', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${receiverToken}`,
                'Content-Type': 'application/json'
            }
        });

        const pendingResult = await pendingResponse.json();
        
        console.log(`📊 API Response Status: ${pendingResponse.status}`);
        console.log(`📊 API Response:`, JSON.stringify(pendingResult, null, 2));

        if (pendingResult.status === 'success') {
            console.log(`\n✅ SUCCESS! Found ${pendingResult.results} pending requests`);
            
            if (pendingResult.data.requests.length > 0) {
                console.log('\n📝 Pending requests details:');
                pendingResult.data.requests.forEach((request, index) => {
                    console.log(`  ${index + 1}. Trip ID: ${request.tripReqId}`);
                    console.log(`      From: ${request.user?.firstName || request.user?.userName || 'Unknown'}`);
                    console.log(`      Photo: ${request.user?.displayPhoto ? 'Yes' : 'No'}`);
                    console.log(`      Status: ${request.status}`);
                    console.log(`      Location: ${request.destination || 'Not specified'}`);
                });
            } else {
                console.log('\n⚠️ No pending requests found for this user');
            }
        } else {
            console.log('❌ API Error:', pendingResult.message);
        }

    } catch (error) {
        console.error('❌ Error testing API:', error.message);
    }
}

testPendingRequestsAPI();