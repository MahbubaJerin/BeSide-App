const TripRequest = require("../models/tripRequestModel");
const TripMatch = require("../models/tripMatchModel");
const UserLocation = require("../models/userLocationModel");
const User = require("../models/userModel");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

// Schedule automatic cleanup every 10 minutes
let cleanupInterval = null;

const startCleanupScheduler = () => {
    if (cleanupInterval) return; // Already running
    
    console.log("🕐 [SCHEDULER] Starting automatic cleanup scheduler...");
    cleanupInterval = setInterval(async () => {
        try {
            await exports.cleanupExpiredRequests();
        } catch (error) {
            console.error("❌ [SCHEDULER] Cleanup error:", error);
        }
    }, 10 * 60 * 1000); // Every 10 minutes
};

const stopCleanupScheduler = () => {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
        console.log("⏹️ [SCHEDULER] Stopped cleanup scheduler");
    }
};

// Export scheduler functions
exports.startCleanupScheduler = startCleanupScheduler;
exports.stopCleanupScheduler = stopCleanupScheduler;

// Start scheduler when module loads
startCleanupScheduler();

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
// Cleanup expired requests
exports.cleanupExpiredRequests = catchAsync(async () => {
    console.log("🧹 [BACKEND] Cleaning up expired requests...");
    
    const expiredRequests = await TripRequest.find({
        status: "pending",
        expiresAt: { $lt: new Date() }
    });

    if (expiredRequests.length > 0) {
        const updateResult = await TripRequest.updateMany(
            { 
                status: "pending", 
                expiresAt: { $lt: new Date() } 
            },
            { 
                status: "expired",
                $push: {
                    recipients: { 
                        $each: [], 
                        $set: { 
                            responseStatus: "declined" 
                        } 
                    }
                }
            }
        );
        
        console.log(`✅ [BACKEND] Marked ${updateResult.modifiedCount} requests as expired`);
    } else {
        console.log("✅ [BACKEND] No expired requests found");
    }
});

exports.getPendingRequests = catchAsync(async (req, res, next) => {
    const userId = req.user._id.toString();

    console.log("🔍 [BACKEND] Getting pending requests for user:", userId);
    
    // Cleanup expired requests first
    await exports.cleanupExpiredRequests();

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

    console.log("🎯 [BACKEND] Responding to trip request:", tripReqId, "with:", response);

    // Validate response
    if (!["accepted", "declined"].includes(response)) {
        return next(new AppError("Response must be either 'accepted' or 'declined'", 400));
    }

    // First, cleanup expired requests
    await exports.cleanupExpiredRequests();

    // Find the trip request with more detailed checking
    let tripRequest = await TripRequest.findOne({ 
        tripReqId,
        "recipients.userId": userId
    });

    console.log("📋 [BACKEND] Found trip request:", !!tripRequest);

    if (!tripRequest) {
        console.log("❌ [BACKEND] Trip request not found for user:", userId);
        return next(new AppError("Trip request not found", 404));
    }

    // Check if request has expired
    if (tripRequest.expiresAt <= new Date()) {
        console.log("⏰ [BACKEND] Trip request has expired");
        tripRequest.status = "expired";
        await tripRequest.save();
        return next(new AppError("Trip request has expired", 410));
    }

    // Check if request is still pending
    if (tripRequest.status !== "pending") {
        console.log("❌ [BACKEND] Trip request is no longer pending. Status:", tripRequest.status);
        return next(new AppError(`Trip request is ${tripRequest.status}`, 409));
    }

    // Update recipient response
    const recipient = tripRequest.recipients.find(r => r.userId === userId);
    if (!recipient) {
        return next(new AppError("You are not a recipient of this request", 403));
    }

    recipient.responseStatus = response;

    // If accepted, update trip request status, set acceptedBy, and create match
    if (response === "accepted") {
        // Check if someone else already accepted
        if (tripRequest.status === "accepted") {
            return next(new AppError("This request has already been accepted by someone else", 409));
        }

        // Update trip request
        tripRequest.status = "accepted";
        tripRequest.acceptedBy = {
            userId: userId,
            userName: req.user.userName,
            acceptedAt: new Date()
        };

        // Mark all other recipients as declined
        tripRequest.recipients.forEach(r => {
            if (r.userId !== userId && ["notified", "viewed"].includes(r.responseStatus)) {
                r.responseStatus = "declined"; // Auto-decline others
            }
        });

        // ✅ CREATE TRIP MATCH
        console.log("🎯 [MATCH CREATION] Creating trip match...");
        
        // Get organizer info (original requester)
        const organizer = await User.findOne({ _id: tripRequest.user.userId });
        if (!organizer) {
            return next(new AppError("Original trip organizer not found", 404));
        }

        // Generate unique match ID
        const matchId = TripMatch.generateMatchId();

        // Create the trip match
        const tripMatch = new TripMatch({
            matchId: matchId,
            originalTripRequest: {
                tripReqId: tripRequest.tripReqId,
                ref: tripRequest._id
            },
            organizer: {
                userId: tripRequest.user.userId,
                userName: tripRequest.user.userName,
                userImage: tripRequest.user.userImage,
                joinedAt: new Date(tripRequest.createdAt)
            },
            companion: {
                userId: userId,
                userName: req.user.userName,
                userImage: req.user.userImage || "default.jpg",
                joinedAt: new Date()
            },
            tripDetails: {
                destination: tripRequest.destination,
                destinationType: tripRequest.destinationType,
                startCoordinates: {
                    latitude: tripRequest.startCoordinates?.latitude || 0,
                    longitude: tripRequest.startCoordinates?.longitude || 0
                },
                plannedDate: tripRequest.date,
                plannedTime: tripRequest.time,
                genderPreference: tripRequest.genderPreference
            },
            status: "active"
        });

        await tripMatch.save();
        
        // Link match to trip request
        tripRequest.matchedTripId = matchId;

        console.log("✅ [MATCH CREATION] Match created successfully:");
        console.log("- Match ID:", matchId);
        console.log("- Organizer:", tripRequest.user.userName);
        console.log("- Companion:", req.user.userName);
    }

    await tripRequest.save();

    // Prepare response data
    let responseData = { 
        tripRequest,
        isMatched: response === "accepted"
    };

    // If accepted, include match information and receiver's route
    if (response === "accepted") {
        const createdMatch = await TripMatch.findOne({ matchId: tripRequest.matchedTripId });
        responseData.tripMatch = createdMatch;
        
        // Include route information for receiver's map update
        responseData.routeData = {
            startLocation: tripRequest.startLocation,
            destinationLocation: tripRequest.destinationLocation,
            routeCoordinates: tripRequest.routeCoordinates,
            transportMode: tripRequest.transportMode,
            meetingPoint: tripRequest.meetingPoint
        };
        
        console.log('🗺️ [BACKEND ROUTE DATA] Sending route data to receiver:', {
            hasStartLocation: !!tripRequest.startLocation,
            hasDestinationLocation: !!tripRequest.destinationLocation,
            destinationCoords: tripRequest.destinationLocation ? 
                `${tripRequest.destinationLocation.latitude},${tripRequest.destinationLocation.longitude}` : 'N/A',
            transportMode: tripRequest.transportMode,
            hasMeetingPoint: !!tripRequest.meetingPoint,
            meetingPointSelected: tripRequest.meetingPoint?.isSelected
        });

        // Get both receiver's and sender's current locations for route calculation
        const receiverLocation = await UserLocation.findOne({ userId: userId });
        const senderLocation = await UserLocation.findOne({ userId: tripRequest.user.userId });
        
        if (receiverLocation && receiverLocation.currentLocation && receiverLocation.currentLocation.coordinates) {
            responseData.receiverLocation = {
                latitude: receiverLocation.currentLocation.coordinates[1],
                longitude: receiverLocation.currentLocation.coordinates[0]
            };
            console.log('📍 [RECEIVER LOCATION] Added receiver location to response:', responseData.receiverLocation);
        } else {
            console.warn('⚠️ [RECEIVER LOCATION] No valid location found for receiver:', userId);
        }
        
        if (senderLocation && senderLocation.currentLocation && senderLocation.currentLocation.coordinates) {
            responseData.senderCurrentLocation = {
                latitude: senderLocation.currentLocation.coordinates[1],
                longitude: senderLocation.currentLocation.coordinates[0]
            };
            console.log('📍 [SENDER LOCATION] Added sender location to response:', responseData.senderCurrentLocation);
        } else {
            console.warn('⚠️ [SENDER LOCATION] No valid location found for sender:', tripRequest.user.userId);
            console.warn('⚠️ [SENDER LOCATION] Sender location data:', senderLocation);
            
            // Fallback: use a default location or the trip request coordinates if available
            if (tripRequest.startLocation && tripRequest.startLocation.latitude && tripRequest.startLocation.longitude) {
                responseData.senderCurrentLocation = {
                    latitude: tripRequest.startLocation.latitude,
                    longitude: tripRequest.startLocation.longitude
                };
                console.log('📍 [SENDER LOCATION] Using stored start location as fallback:', responseData.senderCurrentLocation);
            }
        }
        
        // Enhanced route data with destination text for geocoding
        responseData.routeData = {
            ...responseData.routeData,
            destinationText: tripRequest.destination || 'Destination', // Text address for geocoding
            senderName: tripRequest.user.userName,
            receiverName: req.user.userName
        };
        
        console.log('🎯 [ROUTE DATA] Enhanced route data being sent to receiver:', {
            destinationText: responseData.routeData.destinationText,
            hasStartLocation: !!responseData.routeData.startLocation,
            hasDestinationLocation: !!responseData.routeData.destinationLocation,
            transportMode: responseData.routeData.transportMode,
            hasSenderLocation: !!responseData.senderCurrentLocation,
            hasReceiverLocation: !!responseData.receiverLocation,
            senderCoords: responseData.senderCurrentLocation ? 
                `${responseData.senderCurrentLocation.latitude},${responseData.senderCurrentLocation.longitude}` : 'N/A',
            receiverCoords: responseData.receiverLocation ? 
                `${responseData.receiverLocation.latitude},${responseData.receiverLocation.longitude}` : 'N/A'
        });
    }

    res.status(200).json({
        status: "success",
        message: response === "accepted" 
            ? "🎉 Trip request accepted! Match created successfully!"
            : `Request ${response} successfully`,
        data: responseData
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

// 🎯 NEW MATCH MANAGEMENT APIs

// Get active matches for current user
exports.getActiveMatches = catchAsync(async (req, res, next) => {
    const userId = req.user._id.toString();

    console.log("🔍 [BACKEND] Getting active matches for user:", userId);

    const activeMatches = await TripMatch.findUserActiveMatches(userId);

    console.log("📋 [BACKEND] Found active matches:", activeMatches.length);

    res.status(200).json({
        status: "success",
        results: activeMatches.length,
        data: { matches: activeMatches }
    });
});

// Get match history for current user
exports.getMatchHistory = catchAsync(async (req, res, next) => {
    const userId = req.user._id.toString();
    const limit = parseInt(req.query.limit) || 10;

    console.log("🔍 [BACKEND] Getting match history for user:", userId);

    const matchHistory = await TripMatch.findUserMatchHistory(userId, limit);

    console.log("📋 [BACKEND] Found match history:", matchHistory.length);

    res.status(200).json({
        status: "success",
        results: matchHistory.length,
        data: { matches: matchHistory }
    });
});

// Get specific match details
exports.getMatchDetails = catchAsync(async (req, res, next) => {
    const { matchId } = req.params;
    const userId = req.user._id.toString();

    console.log("🔍 [BACKEND] Getting match details:", matchId, "for user:", userId);

    const match = await TripMatch.findOne({ matchId });

    if (!match) {
        return next(new AppError("Match not found", 404));
    }

    // Check if user is part of this match
    if (!match.includesUser(userId)) {
        return next(new AppError("You are not authorized to view this match", 403));
    }

    console.log("✅ [BACKEND] Match details retrieved successfully");

    res.status(200).json({
        status: "success",
        data: { match }
    });
});

// Update match status (start trip, complete trip, etc.)
exports.updateMatchStatus = catchAsync(async (req, res, next) => {
    const { matchId } = req.params;
    const { status } = req.body;
    const userId = req.user._id.toString();

    // Validate status
    const validStatuses = ['active', 'in-progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return next(new AppError("Invalid status. Must be one of: " + validStatuses.join(', '), 400));
    }

    console.log("🔄 [BACKEND] Updating match status:", matchId, "to:", status);
    console.log("🔍 [BACKEND] Request user ID:", userId);

    const match = await TripMatch.findOne({ matchId });

    if (!match) {
        console.log("❌ [BACKEND] Match not found:", matchId);
        return next(new AppError("Match not found", 404));
    }

    console.log("✅ [BACKEND] Match found:", {
        matchId: match.matchId,
        organizer: match.organizer.userId.toString(),
        companion: match.companion.userId.toString(),
        status: match.status
    });

    // Check if user is part of this match
    if (!match.includesUser(userId)) {
        console.log("❌ [BACKEND] User not authorized for match:", {
            userId,
            organizer: match.organizer.userId.toString(),
            companion: match.companion.userId.toString()
        });
        return next(new AppError("You are not authorized to update this match", 403));
    }

    // Update status and progression timestamps
    match.status = status;
    
    if (status === 'in-progress' && !match.progression.started) {
        match.progression.started = new Date();
    } else if (status === 'completed' && !match.progression.completed) {
        match.progression.completed = new Date();
    } else if (status === 'cancelled' && !match.progression.cancelled) {
        match.progression.cancelled = new Date();
    }

    await match.save();

    console.log("✅ [BACKEND] Match status updated successfully");

    res.status(200).json({
        status: "success",
        message: `Match status updated to ${status}`,
        data: { match }
    });
});

// Set meeting point for a match
exports.setMeetingPoint = catchAsync(async (req, res, next) => {
    const { matchId } = req.params;
    const { name, description, latitude, longitude, type } = req.body;
    const userId = req.user._id.toString();

    console.log("📍 [BACKEND] Setting meeting point for match:", matchId);

    // Validate required fields
    if (!name || !latitude || !longitude) {
        return next(new AppError("Meeting point name, latitude, and longitude are required", 400));
    }

    const match = await TripMatch.findOne({ matchId });

    if (!match) {
        return next(new AppError("Match not found", 404));
    }

    // Check if user is part of this match
    if (!match.includesUser(userId)) {
        return next(new AppError("You are not authorized to set meeting point for this match", 403));
    }

    // Set meeting point
    match.meetingPoint = {
        name: name.trim(),
        description: description || '',
        location: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude)
        },
        type: type || 'custom',
        setBy: userId,
        setAt: new Date()
    };

    await match.save();

    // Notify other user about meeting point
    const otherUser = match.getOtherUser(userId);
    if (otherUser && otherUser.userId) {
        // Here you could send a push notification about the meeting point
        console.log("📱 [BACKEND] Notifying user about meeting point:", otherUser.userId);
    }

    console.log("✅ [BACKEND] Meeting point set successfully");

    res.status(200).json({
        status: "success",
        message: "Meeting point set successfully",
        data: { 
            match,
            meetingPoint: match.meetingPoint
        }
    });
});

// Update live location during trip
exports.updateLiveLocation = catchAsync(async (req, res, next) => {
    const { matchId } = req.params;
    const { latitude, longitude } = req.body;
    const userId = req.user._id.toString();

    console.log("📍 [BACKEND] Updating live location for match:", matchId);

    // Validate coordinates
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        return next(new AppError("Valid latitude and longitude are required", 400));
    }

    const match = await TripMatch.findOne({ matchId });

    if (!match) {
        return next(new AppError("Match not found", 404));
    }

    // Check if user is part of this match
    if (!match.includesUser(userId)) {
        return next(new AppError("You are not authorized to update location for this match", 403));
    }

    // Update location based on user role
    const isOrganizer = match.organizer.userId.toString() === userId;
    const locationUpdate = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        lastUpdated: new Date()
    };

    if (isOrganizer) {
        match.liveLocationSharing.organizerLocation = locationUpdate;
    } else {
        match.liveLocationSharing.companionLocation = locationUpdate;
    }

    // Enable location sharing if not already enabled
    match.liveLocationSharing.enabled = true;

    await match.save();

    console.log(`✅ [BACKEND] Location updated for ${isOrganizer ? 'organizer' : 'companion'}`);

    res.status(200).json({
        status: "success",
        message: "Location updated successfully",
        data: { 
            match,
            userRole: isOrganizer ? 'organizer' : 'companion',
            location: locationUpdate
        }
    });
});

// Get live locations of both users in a match
exports.getLiveLocations = catchAsync(async (req, res, next) => {
    const { matchId } = req.params;
    const userId = req.user._id.toString();

    const match = await TripMatch.findOne({ matchId });

    if (!match) {
        return next(new AppError("Match not found", 404));
    }

    // Check if user is part of this match
    if (!match.includesUser(userId)) {
        return next(new AppError("You are not authorized to view locations for this match", 403));
    }

    console.log("📍 [BACKEND] Getting live locations for match:", matchId);

    res.status(200).json({
        status: "success",
        data: {
            matchId,
            locationSharing: match.liveLocationSharing,
            meetingPoint: match.meetingPoint,
            tripStatus: match.status
        }
    });
});

// Send notification to other user in match
exports.sendTripNotification = catchAsync(async (req, res, next) => {
    const { matchId } = req.params;
    const { type, message, data } = req.body;
    const userId = req.user._id.toString();

    console.log("📱 [BACKEND] Sending trip notification:", type, message);

    const match = await TripMatch.findOne({ matchId });

    if (!match) {
        return next(new AppError("Match not found", 404));
    }

    // Check if user is part of this match
    if (!match.includesUser(userId)) {
        return next(new AppError("You are not authorized to send notifications for this match", 403));
    }

    // Get the other user
    const otherUser = match.getOtherUser(userId);
    if (!otherUser) {
        return next(new AppError("Other user not found in match", 404));
    }

    // In a real app, you would send push notifications here
    // For now, we'll just log the notification
    console.log(`📱 [BACKEND] Notification sent to ${otherUser.userName}:`, {
        type,
        message,
        data,
        from: req.user.userName,
        matchId
    });

    res.status(200).json({
        status: "success",
        message: "Notification sent successfully",
        data: {
            recipient: otherUser.userName,
            type,
            message
        }
    });
});