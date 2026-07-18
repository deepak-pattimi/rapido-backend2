const express = require("express");
const router = express.Router();
const { verifyToken, verifyApprovedDriver } = require("../middlewares/auth");
const validate = require("../middlewares/validate"); // 🟢 Import the validator
const { bookRideSchema, calculateFareSchema, acceptRideSchema, completeRideSchema, updateLocationSchema, nearbyDriversSchema } = require("../validations/rideValidation");

const {
  calculateFare,
  acceptRide,
  completeRide,
  getRideHistory,
  bookRide,
  getRideStatus,
  cancelRide,
  availableRides,
  cancelRideByDriver,
  startRide,
  updateRideLocation,
  currentRide,
  getNearbyDrivers,
  skipSchedule,
  submitReview,
} = require("../controllers/rideController");

// 🟢 Routes with added validation
router.post("/calculate-fare", validate(calculateFareSchema), calculateFare);
router.post("/book", verifyToken, validate(bookRideSchema), bookRide);
router.post("/nearby-drivers", verifyToken, validate(nearbyDriversSchema), getNearbyDrivers);
router.post("/:rideId/review", verifyToken, submitReview);

// Standard routes (Assuming you want to add validation here too later)
router.post("/available", verifyToken, verifyApprovedDriver, availableRides);
router.get("/current-ride", verifyToken, currentRide);
router.post("/accept-ride", verifyToken, verifyApprovedDriver, validate(acceptRideSchema), acceptRide);
router.post("/driver-cancel", verifyToken, verifyApprovedDriver, cancelRideByDriver);
router.post("/start-ride", verifyToken, verifyApprovedDriver, startRide);
router.post("/complete-ride", verifyToken, verifyApprovedDriver, validate(completeRideSchema), completeRide);
router.put("/:rideId/location", verifyToken, verifyApprovedDriver, validate(updateLocationSchema), updateRideLocation);
router.get("/history/:userId", verifyToken, getRideHistory);
router.post("/cancel", verifyToken, cancelRide);
router.post("/skip-schedule", verifyToken, skipSchedule);
router.get("/:rideId", verifyToken, getRideStatus);

module.exports = router;