const http = require('http');

// Test meeting point update with the new data structure
async function testMeetingPointUpdate() {
  try {
    console.log('Testing meeting point update...');
    
    const testMeetingPoint = {
      name: "Central Meeting Point",
      description: "Convenient central location", 
      type: "suggested",
      latitude: -37.8136,
      longitude: 144.9631,
      address: "Federation Square, Melbourne VIC, Australia"
    };
    
    console.log('Meeting point data to send:', JSON.stringify(testMeetingPoint, null, 2));
    
    const postData = JSON.stringify({
      meetingPoint: testMeetingPoint
    });
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/trip/TEST_TRIP_REQ_001/meeting-point',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Response status:', res.statusCode);
        console.log('Response data:', data);
      });
    });
    
    req.on('error', (error) => {
      console.error('Error:', error.message);
    });
    
    req.write(postData);
    req.end();
    
  } catch (error) {
    console.error('Error testing meeting point:', error.message);
  }
}

testMeetingPointUpdate();