const TripRequest = require("../models/tripRequestModel");
const UserLocation = require("../models/userLocationModel");
const User = require("../models/userModel");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

// Send trip request to nearby users
exports.sendTripRequestToNearby = catchAsync(async (req, res, next) => {
    const { tripReqId, startCoordinates, searchRadius = 500 } = req.body;
    const senderId = req.user._id;

    console.log("🔍 [BACKEND] Send to nearby users request:");
    console.log("- Sender ID:", senderId);
    console.log("- Trip Request ID:", tripReqId);
    console.log("- Start Coordinates:", startCoordinates);
    console.log("- Search Radius:", searchRadius);

    // Validate required fields
    if (!tripReqId || !startCoordinates) {
        console.log("❌ [BACKEND] Missing required fields");
        return next(new AppError("Trip request ID and start coordinates are required", 400));
    }

    if (!startCoordinates.longitude || !startCoordinates.latitude) {
        console.log("❌ [BACKEND] Invalid coordinates");
        return next(new AppError("Valid coordinates (longitude, latitude) are required", 400));
    }

    // Find the trip request
    const tripRequest = await TripRequest.findOne({ tripReqId });
    console.log("📋 [BACKEND] Trip request found:", !!tripRequest);
    if (!tripRequest) {
        console.log("❌ [BACKEND] Trip request not found in database");
        return next(new AppError("Trip request not found", 404));
    }

    // Check if the trip request belongs to the current user
    console.log("👤 [BACKEND] Trip request owner:", tripRequest.user.userId, "vs sender:", senderId.toString());
    if (tripRequest.user.userId !== senderId.toString()) {
        console.log("❌ [BACKEND] User not authorized for this trip request");
        return next(new AppError("You can only send your own trip requests", 403));
    }

    // Find nearby active users
    console.log("🔍 [BACKEND] Searching for nearby users...");
    const nearbyUsers = await UserLocation.findNearbyUsers(
        startCoordinates.longitude,
        startCoordinates.latitude,
        searchRadius,
        senderId
    );
    console.log("📍 [BACKEND] Found nearby users:", nearbyUsers.length);
    console.log("📍 [BACKEND] Nearby users:", nearbyUsers.map(u => ({ userId: u.userId, userName: u.userName })));

    // Filter out the sender, users who already received this request, and verify they exist in Users collection
    const eligibleUsers = [];
    for (const user of nearbyUsers) {
        const isNotSender = user.userId.toString() !== senderId.toString();
        const notAlreadyRecipient = !tripRequest.recipients.some(recipient => recipient.userId === user.userId.toString());
        
        // Check if user actually exists in Users collection
        const userExists = await User.findById(user.userId);
        
        console.log(`- User ${user.userName}: isNotSender=${isNotSender}, notAlreadyRecipient=${notAlreadyRecipient}, userExists=${!!userExists}`);
        
        if (isNotSender && notAlreadyRecipient && userExists) {
            eligibleUsers.push(user);
        } else if (!userExists) {
            console.log(`⚠️ [BACKEND] User ${user.userName} (${user.userId}) exists in UserLocation but not in Users collection - skipping`);
        }
    }

    console.log("✅ [BACKEND] Eligible users:", eligibleUsers.length);

    if (eligibleUsers.length === 0) {
        console.log("⚠️ [BACKEND] No eligible users found");
        return res.status(200).json({
            status: "success",
            message: "No new nearby users found",
            data: {
                tripRequest,
                recipientCount: 0,
                debug: {
                    totalNearbyUsers: nearbyUsers.length,
                    alreadySent: tripRequest.recipients.length
                }
            }
        });
    }

    // Update trip request with recipients
    const newRecipients = eligibleUsers.map(user => ({
        userId: user.userId.toString(),
        userName: user.userName,
        responseStatus: "notified"
    }));

    console.log("📤 [BACKEND] Adding recipients:", newRecipients);

    // Add new recipients to existing ones
    tripRequest.recipients.push(...newRecipients);
    await tripRequest.save();

    console.log("✅ [BACKEND] Trip request updated successfully");

    res.status(200).json({
        status: "success",
        message: `Trip request sent to ${newRecipients.length} nearby users`,
        data: {
            tripRequest,
            recipientCount: newRecipients.length,
            totalRecipients: tripRequest.recipients.length
        }
    });
});

// Get pending requests for current user
exports.getPendingRequests = catchAsync(async (req, res, next) => {
    const userId = req.user._id.toString();

    console.log("🔍 [BACKEND] Getting pending requests for user:", userId);

    const requests = await TripRequest.find({
        "recipients.userId": userId,
        "recipients.responseStatus": { $in: ["notified", "viewed"] },
        status: "pending",
        expiresAt: { $gt: new Date() }
    }).populate('user.userId', 'firstName lastName profilePhoto');

    console.log("📋 [BACKEND] Raw requests found:", requests.length);

    // Filter requests where the current user hasn't responded
    const pendingRequests = requests.filter(request => {
        const userRecipient = request.recipients.find(r => r.userId === userId);
        const isEligible = userRecipient && ["notified", "viewed"].includes(userRecipient.responseStatus);
        console.log(`- Request ${request.tripReqId}: userRecipient=${!!userRecipient}, isEligible=${isEligible}`);
        return isEligible;
    });

    console.log("✅ [BACKEND] Filtered pending requests:", pendingRequests.length);

    res.status(200).json({
        status: "success",
        results: pendingRequests.length,
        data: { requests: pendingRequests }
    });
});

// Mark request as viewed
exports.markRequestAsViewed = catchAsync(async (req, res, next) => {
    const { tripReqId } = req.body;
    const userId = req.user._id.toString();

    const tripRequest = await TripRequest.findOne({ 
        tripReqId,
        "recipients.userId": userId 
    });

    if (!tripRequest) {
        return next(new AppError("Trip request not found", 404));
    }

    // Update recipient response status to viewed
    const recipient = tripRequest.recipients.find(r => r.userId === userId);
    if (recipient && recipient.responseStatus === "notified") {
        recipient.responseStatus = "viewed";
        await tripRequest.save();
    }

    res.status(200).json({
        status: "success",
        message: "Request marked as viewed"
    });
});

// Respond to trip request (accept/decline)
exports.respondToTripRequest = catchAsync(async (req, res, next) => {
    const { tripReqId, response } = req.body;
    const userId = req.user._id.toString();

    // Validate response
    if (!["accepted", "declined"].includes(response)) {
        return next(new AppError("Response must be either 'accepted' or 'declined'", 400));
    }

    const tripRequest = await TripRequest.findOne({ 
        tripReqId,
        "recipients.userId": userId,
        status: "pending",
        expiresAt: { $gt: new Date() }
    });

    if (!tripRequest) {
        return next(new AppError("Trip request not found or has expired", 404));
    }

    // Update recipient response
    const recipient = tripRequest.recipients.find(r => r.userId === userId);
    if (!recipient) {
        return next(new AppError("You are not a recipient of this request", 403));
    }

    recipient.responseStatus = response;

    // If accepted, update trip request status and set acceptedBy
    if (response === "accepted") {
        // Check if someone else already accepted
        if (tripRequest.status === "accepted") {
            return next(new AppError("This request has already been accepted by someone else", 409));
        }

        tripRequest.status = "accepted";
        tripRequest.acceptedBy = {
            userId: userId,
            userName: req.user.userName,
            acceptedAt: new Date()
        };

        // Mark all other recipients as expired
        tripRequest.recipients.forEach(r => {
            if (r.userId !== userId && ["notified", "viewed"].includes(r.responseStatus)) {
                r.responseStatus = "declined"; // Auto-decline others
            }
        });
    }

    await tripRequest.save();

    res.status(200).json({
        status: "success",
        message: `Request ${response} successfully`,
        data: { 
            tripRequest,
            isMatched: response === "accepted"
        }
    });
});

// Get sent requests status (for sender)
exports.getSentRequestsStatus = catchAsync(async (req, res, next) => {
    const userId = req.user._id.toString();

    const requests = await TripRequest.find({
        "user.userId": userId,
        status: { $in: ["pending", "accepted"] },
        expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    res.status(200).json({
        status: "success",
        results: requests.length,
        data: { requests }
    });
});

// Cancel trip request (for sender)
exports.cancelTripRequest = catchAsync(async (req, res, next) => {
    const { tripReqId } = req.body;
    const userId = req.user._id.toString();

    const tripRequest = await TripRequest.findOne({ 
        tripReqId,
        "user.userId": userId,
        status: { $in: ["pending"] }
    });

    if (!tripRequest) {
        return next(new AppError("Trip request not found or cannot be cancelled", 404));
    }

    tripRequest.status = "expired";
    await tripRequest.save();

    res.status(200).json({
        status: "success",
        message: "Trip request cancelled successfully",
        data: { tripRequest }
    });
});