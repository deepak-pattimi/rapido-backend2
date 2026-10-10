const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth");
const {
  createOrder,
  verifyPayment,
  setPaymentMethod,
  renderCheckoutPage,
} = require("../controllers/paymentController");

// Protected API routes
router.post("/create-order", verifyToken, createOrder);
router.post("/verify-payment", verifyToken, verifyPayment);
router.post("/set-payment-method", verifyToken, setPaymentMethod);

// Public Checkout HTML page (for in-app browser or WebBrowser)
router.get("/checkout/:rideId", renderCheckoutPage);

module.exports = router;
