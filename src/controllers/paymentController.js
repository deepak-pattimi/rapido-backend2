const crypto = require("crypto");
const axios = require("axios");
const asyncHandler = require("../utils/asyncHandler");
const Ride = require("../models/Ride");

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_TatQUdLS6uQPcv";
const RAZORPAY_SECRET = process.env.RAZORPAY_SECRET || "wL3qioD7erC56yLsw6MqQCcD";

// 🟢 1. Create Razorpay Order
exports.createOrder = asyncHandler(async (req, res) => {
  const { rideId } = req.body;
  if (!rideId) {
    return res.status(400).json({ success: false, error: "Ride ID is required" });
  }

  const ride = await Ride.findById(rideId);
  if (!ride) {
    return res.status(404).json({ success: false, error: "Ride not found" });
  }

  const amountInPaise = Math.max(100, Math.round((ride.fare || 0) * 100)); // Minimum ₹1

  try {
    const authHeader = "Basic " + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_SECRET}`).toString("base64");
    const response = await axios.post(
      "https://api.razorpay.com/v1/orders",
      {
        amount: amountInPaise,
        currency: "INR",
        receipt: `rcpt_${ride._id.toString().slice(-8)}_${Date.now()}`,
        notes: {
          rideId: ride._id.toString(),
          customerId: ride.customerId ? ride.customerId.toString() : "",
        },
      },
      {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
      }
    );

    const razorpayOrder = response.data;
    ride.razorpayOrderId = razorpayOrder.id;
    ride.paymentMethod = "ONLINE";
    await ride.save();

    res.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: RAZORPAY_KEY_ID,
      fare: ride.fare,
      rideId: ride._id,
    });
  } catch (error) {
    console.error("Razorpay order creation error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.description || "Failed to create Razorpay order",
    });
  }
});

// 🟢 2. Verify Razorpay Payment Signature
exports.verifyPayment = asyncHandler(async (req, res) => {
  const { rideId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!rideId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      error: "Missing payment verification parameters",
    });
  }

  const ride = await Ride.findById(rideId);
  if (!ride) {
    return res.status(404).json({ success: false, error: "Ride not found" });
  }

  const generatedSignature = crypto
    .createHmac("sha256", RAZORPAY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generatedSignature !== razorpay_signature) {
    return res.status(400).json({
      success: false,
      error: "Payment verification failed: Invalid signature",
    });
  }

  ride.paymentStatus = "PAID";
  ride.paymentMethod = "ONLINE";
  ride.razorpayPaymentId = razorpay_payment_id;
  ride.razorpaySignature = razorpay_signature;
  await ride.save();

  // Real-time broadcast to Customer & Driver
  const io = req.app.get("io");
  if (io) {
    const payload = {
      rideId: ride._id,
      paymentStatus: "PAID",
      paymentMethod: "ONLINE",
      fare: ride.fare,
    };
    if (ride.customerId) io.to(ride.customerId.toString()).emit("paymentUpdated", payload);
    if (ride.driverId) io.to(ride.driverId.toString()).emit("paymentUpdated", payload);
  }

  res.json({
    success: true,
    message: "Payment verified successfully",
    paymentStatus: "PAID",
    paymentMethod: "ONLINE",
    ride,
  });
});

// 🟢 3. Update Payment Method (e.g. choose Cash)
exports.setPaymentMethod = asyncHandler(async (req, res) => {
  const { rideId, paymentMethod } = req.body;
  if (!rideId || !paymentMethod) {
    return res.status(400).json({ success: false, error: "Missing rideId or paymentMethod" });
  }

  const ride = await Ride.findById(rideId);
  if (!ride) {
    return res.status(404).json({ success: false, error: "Ride not found" });
  }

  ride.paymentMethod = paymentMethod === "ONLINE" ? "ONLINE" : "CASH";
  await ride.save();

  const io = req.app.get("io");
  if (io) {
    const payload = {
      rideId: ride._id,
      paymentStatus: ride.paymentStatus,
      paymentMethod: ride.paymentMethod,
      fare: ride.fare,
    };
    if (ride.customerId) io.to(ride.customerId.toString()).emit("paymentUpdated", payload);
    if (ride.driverId) io.to(ride.driverId.toString()).emit("paymentUpdated", payload);
  }

  res.json({
    success: true,
    paymentMethod: ride.paymentMethod,
    paymentStatus: ride.paymentStatus,
    ride,
  });
});

// 🟢 4. Hosted HTML Checkout (For Mobile Browser / WebView)
exports.renderCheckoutPage = asyncHandler(async (req, res) => {
  const { rideId } = req.params;
  const ride = await Ride.findById(rideId).populate("customerId", "name phone email");
  if (!ride) {
    return res.status(404).send("<h3>Ride not found</h3>");
  }

  if (ride.paymentStatus === "PAID") {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Completed</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 40px 20px; background: #0D121B; color: #fff; }
          .card { background: #1D2838; border-radius: 20px; padding: 30px; border: 1px solid #354359; max-width: 400px; margin: auto; }
          .icon { font-size: 50px; color: #10B981; }
          h2 { margin: 15px 0 8px; color: #F2F5FA; }
          p { color: #A9B7CA; font-size: 15px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✓</div>
          <h2>Payment Already Done</h2>
          <p>₹${ride.fare} has been successfully paid online for this ride.</p>
        </div>
      </body>
      </html>
    `);
  }

  const amountInPaise = Math.max(100, Math.round((ride.fare || 0) * 100));

  let orderId = ride.razorpayOrderId;
  if (!orderId) {
    try {
      const authHeader = "Basic " + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_SECRET}`).toString("base64");
      const orderRes = await axios.post(
        "https://api.razorpay.com/v1/orders",
        {
          amount: amountInPaise,
          currency: "INR",
          receipt: `rcpt_${ride._id.toString().slice(-8)}_${Date.now()}`,
          notes: { rideId: ride._id.toString() },
        },
        { headers: { Authorization: authHeader, "Content-Type": "application/json" } }
      );
      orderId = orderRes.data.id;
      ride.razorpayOrderId = orderId;
      await ride.save();
    } catch (e) {
      console.error("Order creation failed in renderCheckout:", e.message);
    }
  }

  const customerName = ride.customerId?.name || "Rider";
  const customerPhone = ride.customerId?.phone || "";
  const customerEmail = ride.customerId?.email || "customer@inryde.app";

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>InRyde Payment</title>
      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0D121B; color: #fff; margin: 0; padding: 24px; display: flex; justify-content: center; align-items: center; min-height: 100vh; box-sizing: border-box; }
        .card { background: #1D2838; border-radius: 24px; padding: 28px; border: 1px solid #354359; width: 100%; max-width: 400px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .brand { font-size: 22px; font-weight: 800; color: #F5C45F; margin-bottom: 20px; letter-spacing: -0.5px; }
        .fare { font-size: 38px; font-weight: 800; margin: 15px 0; color: #FFF; }
        .desc { font-size: 14px; color: #A9B7CA; margin-bottom: 25px; line-height: 1.5; }
        .btn { background: #F5C45F; color: #1F1A08; border: none; border-radius: 16px; font-size: 16px; font-weight: 700; width: 100%; padding: 15px; cursor: pointer; transition: all 0.2s; }
        .btn:hover { background: #E5B44F; }
        .status-msg { margin-top: 20px; font-size: 14px; color: #10B981; display: none; }
        .loader { display: inline-block; width: 18px; height: 18px; border: 2px solid #1F1A08; border-radius: 50%; border-top-color: transparent; animation: spin 0.8s linear infinite; vertical-align: middle; margin-right: 8px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="brand">InRyde Pay</div>
        <div class="desc">Ride Fare Payment</div>
        <div class="fare">₹${ride.fare}</div>
        <button id="pay-btn" class="btn" onclick="openRazorpay()">Pay ₹${ride.fare} Now</button>
        <div id="status-msg" class="status-msg"></div>
      </div>

      <script>
        const options = {
          key: "${RAZORPAY_KEY_ID}",
          amount: ${amountInPaise},
          currency: "INR",
          name: "InRyde",
          description: "Ride Payment",
          order_id: "${orderId || ""}",
          prefill: {
            name: "${customerName}",
            contact: "${customerPhone}",
            email: "${customerEmail}"
          },
          theme: {
            color: "#F5C45F"
          },
          handler: function (response) {
            document.getElementById("pay-btn").disabled = true;
            document.getElementById("pay-btn").innerHTML = '<span class="loader"></span>Verifying...';
            
            fetch("/api/payments/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                rideId: "${ride._id}",
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              })
            })
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                document.getElementById("pay-btn").style.display = "none";
                document.getElementById("status-msg").style.display = "block";
                document.getElementById("status-msg").innerHTML = "✓ Payment Successful! You can return to the app.";
                setTimeout(() => {
                  try { window.close(); } catch(e){}
                }, 2000);
              } else {
                alert(data.error || "Verification failed");
                document.getElementById("pay-btn").disabled = false;
                document.getElementById("pay-btn").innerText = "Retry Payment";
              }
            })
            .catch(err => {
              alert("Network error verifying payment");
              document.getElementById("pay-btn").disabled = false;
              document.getElementById("pay-btn").innerText = "Retry Payment";
            });
          },
          modal: {
            ondismiss: function() {
              console.log("Checkout dismissed");
            }
          }
        };

        function openRazorpay() {
          const rzp = new Razorpay(options);
          rzp.open();
        }

        // Auto-open on load
        window.onload = function() {
          setTimeout(openRazorpay, 300);
        };
      </script>
    </body>
    </html>
  `);
});
