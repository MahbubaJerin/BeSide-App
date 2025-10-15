const https = require('https');
const http = require('http');

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const protocol = options.protocol === 'https:' ? https : http;
        const req = protocol.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (error) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testNotificationAPI() {
    try {
        console.log('🔄 Testing notification API...\n');

        const BASE_URL = 'http://localhost:5000';
        
        // First, create a new test user or try to login
        console.log('👤 Creating test receiver user...');
        
        const registerOptions = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/v1/auth/register',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const registerData = {
            userName: 'testreceiver',
            firstName: 'Test',
            lastName: 'Receiver',
            email: 'test-receiver@example.com',
            mobileNo: '+61412345678',
            password: 'Password123!',
            gender: 'female',
            address: {
                country: 'Australia',
                countryCode: 'AU'
            }
        };

        let receiverToken;
        const registerResponse = await makeRequest(registerOptions, registerData);
        
        if (registerResponse.status === 201) {
            console.log('✅ Registration successful!');
            receiverToken = registerResponse.data.token;
        } else if (registerResponse.status === 400 && registerResponse.data.message === 'User already exists') {
            console.log('ℹ️ User exists, trying login...');
            
            const loginOptions = {
                hostname: 'localhost',
                port: 5000,
                path: '/api/v1/auth/login',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const loginData = {
                email: 'test-receiver@example.com',
                password: 'Password123!'
            };

            const loginResponse = await makeRequest(loginOptions, loginData);
            
            if (loginResponse.status !== 200) {
                console.log(`❌ Login failed with status: ${loginResponse.status}`);
                console.log('Response:', loginResponse.data);
                return;
            }

            console.log('✅ Login successful!');
            receiverToken = loginResponse.data.token;
        } else {
            console.log(`❌ Registration/Login failed with status: ${registerResponse.status}`);
            console.log('Response:', registerResponse.data);
            return;
        }
        
        console.log(`🔑 Token received (length: ${receiverToken.length})`);

        // Now test the pending requests API
        console.log('\n📬 Getting pending requests...');
        
        const pendingOptions = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/v1/trip/pending-requests',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${receiverToken}`,
                'Content-Type': 'application/json'
            }
        };

        const pendingResponse = await makeRequest(pendingOptions);
        
        console.log(`📊 API Response Status: ${pendingResponse.status}`);
        console.log('📋 Response Data:');
        console.log(JSON.stringify(pendingResponse.data, null, 2));

        if (pendingResponse.status === 200) {
            const requests = pendingResponse.data.data?.requests || pendingResponse.data.requests || [];
            console.log(`\n✅ SUCCESS! Found ${requests.length} pending requests`);
            
            if (requests.length > 0) {
                console.log('\n📝 Request details:');
                requests.forEach((req, index) => {
                    console.log(`  ${index + 1}. Trip ID: ${req.tripReqId}`);
                    console.log(`      From: ${req.user?.firstName || req.user?.userName || 'Unknown'} ${req.user?.lastName || ''}`);
                    console.log(`      Location: ${req.startingLocation?.address || req.from || 'N/A'} → ${req.destination || req.to || 'N/A'}`);
                    console.log(`      Photo: ${req.user?.displayPhoto ? 'Yes' : 'No'} (${req.user?.displayPhoto || 'None'})`);
                    console.log(`      Status: ${req.status}`);
                    console.log(`      Expires: ${req.expiresAt}`);
                    console.log(`      ---`);
                });

                // This means the notification system is working!
                console.log('\n🎉 NOTIFICATION SYSTEM IS WORKING!');
                console.log('✅ Receivers CAN get pending requests with all sender information and photos');
            }
        } else {
            console.log(`❌ API call failed with status: ${pendingResponse.status}`);
            console.log('Error:', pendingResponse.data);
        }

    } catch (error) {
        console.error('❌ Error testing notification API:', error);
    }
}

testNotificationAPI();