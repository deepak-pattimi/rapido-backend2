const express = require("express");
const router = express.Router();
const {
  requestOTP,
  verifyOTP,
  driverLogin,
  driverRegister,
  customerLogin,
  customerRegister,
} = require("../controllers/authController");

router.post("/request-otp", requestOTP);
router.post("/verify-otp", verifyOTP);

router.post("/driver-login", driverLogin);
router.post("/driver-register", driverRegister);

router.post("/customer-login", customerLogin);
router.post("/customer-register", customerRegister);

module.exports = router;
