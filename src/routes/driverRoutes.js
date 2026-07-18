const express = require("express");
const router = express.Router();
const { verifyToken, verifyApprovedDriver } = require("../middlewares/auth");
const {
  getDriverProfile,
  updateDriverPreferences,
  getDriverHistory,
  getDriverEarnings,
  updateDriverLocation,
  driverDashboard,
  toggleDriverStatus, updateDriverPushToken,
  updateDriverServices,
} = require("../controllers/driverController");

router.get("/profile", verifyToken, getDriverProfile);
router.get("/dashboard", verifyToken, driverDashboard);
router.put('/update-push-token', verifyToken, updateDriverPushToken);

router.post("/preferences", verifyToken, verifyApprovedDriver, updateDriverPreferences);
router.post("/services", verifyToken, verifyApprovedDriver, updateDriverServices);
router.get("/history", verifyToken, verifyApprovedDriver, getDriverHistory);
router.get("/earnings", verifyToken, verifyApprovedDriver, getDriverEarnings);
router.post("/update-location", verifyToken, verifyApprovedDriver, updateDriverLocation);
router.post("/toggle-status", verifyToken, verifyApprovedDriver, toggleDriverStatus);

module.exports = router;
