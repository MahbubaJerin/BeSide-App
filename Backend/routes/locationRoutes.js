const express = require("express");
const locationController = require("../controllers/locationController");
const authController = require("../controllers/authController");

const router = express.Router();

// All routes require authentication
router.use(authController.protect);

// Location management routes
router.post("/update", locationController.updateLocation);
router.get("/status", locationController.getLocationStatus);
router.patch("/preferences", locationController.updateLocationPreferences);

// Companion finding routes
router.get("/nearby", locationController.findNearbyCompanions);
router.patch("/stop-searching", locationController.stopSearching);

// Admin/utility routes
router.delete("/clean-old", authController.restrictTo("admin"), locationController.cleanOldLocations);

module.exports = router;
