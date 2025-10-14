const express = require("express");
const router = express.Router();

const tripController = require("../controllers/tripController");
const notificationController = require("../controllers/notificationController");
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

// Notification routes for companion matching
router.post(
  "/send-to-nearby",
  notificationController.sendTripRequestToNearby
);

router.get(
  "/pending-requests",
  notificationController.getPendingRequests
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

module.exports = router;