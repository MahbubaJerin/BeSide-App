// Test script for notification API endpoints
// This can be used with Postman or any API testing tool

console.log("=== BeSide App - Notification System API Endpoints ===\n");

const baseURL = "http://localhost:5000/api/v1/trip"; // Adjust port as needed

console.log("📍 NEW NOTIFICATION ENDPOINTS:");
console.log("1. Send to Nearby Users:");
console.log(`   POST ${baseURL}/send-to-nearby`);
console.log("   Body: {");
console.log("     tripReqId: 'your-trip-request-id',");
console.log("     startCoordinates: {");
console.log("       longitude: -122.4194,");
console.log("       latitude: 37.7749");
console.log("     },");
console.log("     searchRadius: 500");
console.log("   }\n");

console.log("2. Get Pending Requests:");
console.log(`   GET ${baseURL}/pending-requests`);
console.log("   Headers: Authorization: Bearer <your-token>\n");

console.log("3. Mark Request as Viewed:");
console.log(`   POST ${baseURL}/mark-viewed`);
console.log("   Body: { tripReqId: 'trip-request-id' }\n");

console.log("4. Respond to Request:");
console.log(`   POST ${baseURL}/respond-request`);
console.log("   Body: {");
console.log("     tripReqId: 'trip-request-id',");
console.log("     response: 'accepted' // or 'declined'");
console.log("   }\n");

console.log("5. Get Sent Requests Status:");
console.log(`   GET ${baseURL}/sent-requests-status`);
console.log("   Headers: Authorization: Bearer <your-token>\n");

console.log("6. Cancel Trip Request:");
console.log(`   POST ${baseURL}/cancel-request`);
console.log("   Body: { tripReqId: 'trip-request-id' }\n");

console.log("✅ All endpoints are ready for testing!");
console.log("🔐 Remember: All endpoints require authentication (Bearer token)");
console.log("📋 Updated TripRequest model includes new fields:");
console.log("   - status, recipients[], acceptedBy, expiresAt, matchedTripId");