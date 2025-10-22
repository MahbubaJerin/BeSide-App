// Test the new active users endpoint
require('dotenv').config();

async function testActiveUsersEndpoint() {
    try {
        console.log('🧪 Testing Active Users Endpoint...\n');

        // First, login to get a token
        console.log('1️⃣ Logging in as lululemom...');
        const loginResponse = await fetch('http://localhost:5000/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'lulu@test.com',
                password: 'testpass123'
            })
        });

        if (!loginResponse.ok) {
            console.log('❌ Login failed. Trying with another user...');
            
            // Try nammu user
            const loginResponse2 = await fetch('http://localhost:5000/api/v1/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'nammu@test.com',
                    password: 'testpass123'
                })
            });
            
            if (!loginResponse2.ok) {
                throw new Error('Could not login with any test user');
            }
            
            const loginData = await loginResponse2.json();
            var token = loginData.token;
            console.log('✅ Logged in as nammu');
        } else {
            const loginData = await loginResponse.json();
            var token = loginData.token;
            console.log('✅ Logged in as lululemom');
        }

        // Test the active users endpoint
        console.log('\n2️⃣ Calling /api/v1/location/active-users endpoint...');
        const activeUsersResponse = await fetch('http://localhost:5000/api/v1/location/active-users?timeWindow=15', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!activeUsersResponse.ok) {
            const errorText = await activeUsersResponse.text();
            console.log('❌ API call failed:', activeUsersResponse.status, errorText);
            throw new Error(`API returned ${activeUsersResponse.status}`);
        }

        const data = await activeUsersResponse.json();
        
        console.log('✅ API call successful!\n');
        console.log('📊 RESULTS:');
        console.log('============================================================');
        console.log(`Time Window: ${data.data.timeWindowMinutes} minutes`);
        console.log(`Total Users: ${data.data.totalUsers}`);
        console.log(`Discoverable Users: ${data.data.discoverableUsers}`);
        console.log('============================================================\n');

        if (data.data.totalUsers > 0) {
            console.log('👥 USER DETAILS:\n');
            data.data.users.forEach((user, index) => {
                console.log(`${index + 1}. ${user.userName}`);
                console.log(`   - Active: ${user.isActive}`);
                console.log(`   - Share Location: ${user.shareLocation}`);
                console.log(`   - Visible to Others: ${user.visibleToOthers}`);
                console.log(`   - Last Seen: ${user.minutesAgo} minute(s) ago`);
                console.log(`   - Discoverable: ${user.isActive && user.shareLocation && user.visibleToOthers ? '✅ YES' : '❌ NO'}\n`);
            });

            console.log('✅ Discoverable Users:', data.data.discoverable.join(', '));
        } else {
            console.log('⚠️ No active users found in the last 15 minutes');
        }

        console.log('\n============================================================');
        console.log('✅ Test completed successfully!');
        console.log('============================================================\n');

        // Summary
        console.log('📋 SUMMARY:');
        console.log(`   - API Endpoint: Working ✅`);
        console.log(`   - User Visibility: ${data.data.discoverableUsers > 0 ? 'Working ✅' : 'No users ⚠️'}`);
        console.log(`   - Location Tracking: ${data.data.totalUsers > 0 ? 'Working ✅' : 'Not working ❌'}`);
        
        if (data.data.totalUsers > 0 && data.data.discoverableUsers === 0) {
            console.log('\n⚠️ WARNING: Users are active but not discoverable!');
            console.log('   Check that shareLocation and visibleToOthers are set to true');
        }

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

// Run the test
console.log('🚀 Starting Active Users API Test\n');
testActiveUsersEndpoint().then(() => {
    console.log('\n✅ All tests completed');
    process.exit(0);
}).catch(err => {
    console.error('\n💥 Test suite failed:', err);
    process.exit(1);
});
