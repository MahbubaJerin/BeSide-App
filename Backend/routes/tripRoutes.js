const express = require("express");
const router = express.Router();

const tripController = require("../controllers/tripController");
const notificationController = require("../controllers/notificationController");
const realtimeController = require("../controllers/realtimeController");
const { model } = require("mongoose");
const { uploadSingle } = require("../utils/fileUpload");
const authController = require("../controllers/authController");

// Protect all routes
router.use(authController.protect);

router.post(
  "/createTripReq",
  tripController.createTripReq
);
router.post(
  "/createTrip",
  tripController.createTrip
);
router.get(
  "/getTripReq",
  tripController.getTripReq
);
router.get(
  "/getTrip",
  tripController.getTrip
);

router.post(
  "/upload-photo/:tripReqId",
  uploadSingle,
  tripController.uploadTripPhoto
);

router.put(
  "/:tripReqId",
  tripController.updateTripRequest
);

// New enhanced routes
router.put(
  "/:tripReqId/meeting-point",
  tripController.setMeetingPoint
);

router.put(
  "/:tripReqId/receiver-consent",
  tripController.completeReceiverConsent
);

router.post(
  "/markArrived",
  tripController.markArrived
);

router.post(
  "/startTrip",
  tripController.startTrip
);

router.post(
  "/cancelTrip",
  tripController.cancelTrip
);

router.post(
  "/endTrip",
  tripController.endTrip
);

router.put(
  "/:tripReqId/expire",
  tripController.expireRequest
);

router.get(
  "/active-request",
  tripController.getActiveRequest
);

// Notification routes for companion matching
router.post(
  "/send-to-nearby",
  notificationController.sendTripRequestToNearby
);

router.get(
  "/pending-requests",
  notificationController.getPendingRequests
);

// Heartbeat endpoint to keep users visible
router.post(
  "/heartbeat",
  notificationController.updateUserHeartbeat
);

// 🚀 REAL-TIME ROUTES
// Server-Sent Events endpoint for real-time updates
router.get(
  "/realtime",
  realtimeController.connectRealtime
);

// Debug endpoint to see connected users
router.get(
  "/connected-users",
  realtimeController.getConnectedUsers
);

// Admin/debug endpoint to manually cleanup expired requests
router.post(
  "/cleanup-expired",
  notificationController.cleanupExpiredRequests
);

router.post(
  "/mark-viewed",
  notificationController.markRequestAsViewed
);

router.post(
  "/respond-request",
  notificationController.respondToTripRequest
);

router.get(
  "/sent-requests-status",
  notificationController.getSentRequestsStatus
);

router.post(
  "/cancel-request",
  notificationController.cancelTripRequest
);

router.get(
  "/trip-history",
  notificationController.getTripHistory
);

// 🎯 MATCH MANAGEMENT ROUTES
router.get(
  "/active-matches",
  notificationController.getActiveMatches
);

router.get(
  "/match-history",
  notificationController.getMatchHistory
);

router.get(
  "/match/:matchId",
  notificationController.getMatchDetails
);

router.patch(
  "/match/:matchId/status",
  notificationController.updateMatchStatus
);

router.post(
  "/match/:matchId/meeting-point",
  notificationController.setMeetingPoint
);

router.post(
  "/match/:matchId/location",
  notificationController.updateLiveLocation
);

router.get(
  "/match/:matchId/locations",
  notificationController.getLiveLocations
);

router.post(
  "/match/:matchId/notify",
  notificationController.sendTripNotification
);

// ===== POST-ACCEPTANCE TRIP MATCH WORKFLOW =====

// Set meeting point
router.post(
  "/match/:matchId/meeting-point",
  tripController.setMeetingPoint
);

// Start live location sharing
router.post(
  "/match/:matchId/start-sharing",
  tripController.startLocationSharing
);

// Update live location during trip
router.post(
  "/match/:matchId/update-location",
  tripController.updateLiveLocation
);

// Get trip match details
router.get(
  "/match/:matchId/details",
  tripController.getTripMatchDetails
);

// Cancel trip match
router.post(
  "/match/:matchId/cancel",
  tripController.cancelTripMatch
);

module.exports = router;