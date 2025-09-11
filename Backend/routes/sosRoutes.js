const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const sosController = require("../controllers/sosController");

// All SOS routes require auth
router.use(authController.protect);

router.post("/send", sosController.sendSOS);

module.exports = router;
