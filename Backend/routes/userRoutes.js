const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

// Public routes
router.get("/public/:userId", userController.getUserById);

// Protect all routes after this middleware
router.use(authController.protect);

// Profile management
router.get("/profile", userController.getUserProfile);
router.put("/profile", userController.updateUserProfile);
router.delete("/profile", userController.deleteUserProfile);

// Profile photo management
router.post(
  "/profile-photo",
  userController.uploadProfilePhoto,
  userController.saveProfilePhoto
);

// Settings management
router.post("/consent", userController.updateConsent);
router.put("/profile-settings", userController.updateProfileSettings);
// Alias for frontend compatibility
router.put("/profile/visibility", userController.updateProfileSettings);
router.patch("/availability", userController.updateAvailability);

// Emergency Contact Routes (NEW) 
router.get("/emergency-contacts", userController.getEmergencyContacts);
router.post("/emergency-contacts", userController.addEmergencyContact);
router.put("/emergency-contacts/:contactId", userController.updateEmergencyContact);
router.delete("/emergency-contacts/:contactId", userController.deleteEmergencyContact);

module.exports = router;
