const Otp = require("../models/Otp");
const Customer = require("../models/Customer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { sendSMS } = require("../services/smsService.js");
const Driver = require("../models/Driver");
const Ride = require("../models/Ride");

// 🟢 1. REQUEST OTP
exports.requestOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone number required" });

    let cleanPhone = phone.toString().trim();
    if (!cleanPhone.startsWith("+91") && cleanPhone.replace(/[^\d]/g, '').length === 10) {
      cleanPhone = `+91${cleanPhone.replace(/[^\d]/g, '')}`;
    }

    let generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();

    // Play Store Reviewer Demo Account Bypass
    const rawDigits = cleanPhone.replace(/[^\d]/g, '');
    const tenDigits = rawDigits.length >= 10 ? rawDigits.slice(-10) : rawDigits;
    if (tenDigits === '9999999999' || tenDigits === '9876543210') {
      generatedOtp = '1234';
    }

    // Save to DB
    await Otp.findOneAndUpdate(
      { phone: cleanPhone },
      { otp: generatedOtp, expiresAt: new Date() },
      { upsert: true, new: true },
    );

    // Skip sending SMS for demo test account
    if (tenDigits !== '9999999999' && tenDigits !== '9876543210') {
      await sendSMS(cleanPhone, generatedOtp);
    }

    res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error("requestOTP error:", error);
    res
      .status(500)
      .json({ error: error.message || "Could not send OTP. Check Exotel gateway." });
  }
};

// 🟢 2. VERIFY OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: "Phone and OTP are required" });
    }

    let cleanPhone = phone.toString().trim();
    const rawDigits = cleanPhone.replace(/[^\d]/g, '');
    const tenDigits = rawDigits.length >= 10 ? rawDigits.slice(-10) : rawDigits;
    const phoneVariants = [
      cleanPhone,
      `+91${tenDigits}`,
      tenDigits
    ];

    // Find the OTP in our temp collection matching any phone variant
    const otpRecord = await Otp.findOne({ phone: { $in: phoneVariants }, otp: otp.toString().trim() });

    if (!otpRecord) {
      return res.status(400).json({ error: "Invalid or expired OTP. Please try again." });
    }

    // OTP is correct! Now find or create the Customer
    const formattedPhone = `+91${tenDigits}`;
    let isNew = false;
    let customer = await Customer.findOne({ phone: { $in: phoneVariants } });

    if (!customer) {
      isNew = true;
      customer = await Customer.create({
        phone: formattedPhone,
        name: "Rider",
        walletBalance: 0,
      });
    }

    // Delete the used OTP record
    await Otp.deleteOne({ _id: otpRecord._id });

    // Generate JWT Token
    const secretKey = process.env.JWT_SECRET || 'your_super_secret_jwt_key_rapido_2026qefiubkj';
    const token = jwt.sign(
      { id: customer._id, role: "CUSTOMER" },
      secretKey,
      { expiresIn: "30d" },
    );

    res.status(200).json({
      success: true,
      token,
      user: { id: customer._id, phone: customer.phone, name: customer.name, email: customer.email || "" },
      isNew,
    });
  } catch (error) {
    console.error("verifyOTP error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.driverLogin = async (req, res) => {
  try {
    const { phone } = req.body;

    // 1. Find the driver in MongoDB
    const driver = await Driver.findOne({ phone });

    if (!driver) {
      return res
        .status(404)
        .json({ success: false, error: "Driver not found. Please register." });
    }

    // 2. Generate JWT Token
    const secretKey = process.env.JWT_SECRET || 'your_super_secret_jwt_key_rapido_2026qefiubkj';
    const token = jwt.sign(
      { id: driver._id, role: "DRIVER" }, // 🟢 Standardize to 'id'
      secretKey,
      { expiresIn: "30d" },
    );

    // 3. Dynamically calculate today's earnings
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const ridesToday = await Ride.aggregate([
      { $match: { driverId: driver._id, status: "COMPLETED", endTime: { $gte: startOfDay } } },
      { $group: { _id: null, total: { $sum: "$driverNetEarning" } } }
    ]);
    const todayEarnings = ridesToday.length > 0 ? ridesToday[0].total : 0;
    
    // 4. Send success JSON back to React Native
    const driverResponse = driver.toObject();
    driverResponse.todayEarnings = todayEarnings;

    res.status(200).json({
      success: true,
      token,
      driver: driverResponse,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ==========================================
// 🟢 NEW: DRIVER REGISTRATION
// ==========================================
exports.driverRegister = async (req, res) => {
  try {
    const payload = req.body;

    // 1. Check if they already exist
    const existingDriver = await Driver.findOne({ phone: payload.phone });
    if (existingDriver) {
      return res
        .status(400)
        .json({ success: false, error: "Phone number already registered." });
    }

    // 2. Create the new Driver in MongoDB
    const newDriver = await Driver.create({
      ...payload,
      vehicleType: payload.vehicleType || "BIKE",
      permitPic: payload.permitPic || "",
      insurancePic: payload.insurancePic || "",
      fitnessPic: payload.fitnessPic || "",
      status: "PENDING", // Force them to PENDING so Admin can verify docs
      walletBalance: 0,
      todayEarnings: 0,
      totalRides: 0,
      rating: 5.0,
      isOnline: false,
    });

    res
      .status(201)
      .json({ success: true, message: "Driver registered successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🟢 CUSTOMER REGISTER
exports.customerRegister = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ success: false, error: "All fields (name, email, password, phone) are required." });
    }

    // Check if email already exists
    const emailExists = await Customer.findOne({ email: email.trim().toLowerCase() });
    if (emailExists) {
      return res.status(400).json({ success: false, error: "Email is already registered." });
    }

    // Check if phone already exists
    const phoneExists = await Customer.findOne({ phone: phone.trim() });
    if (phoneExists) {
      return res.status(400).json({ success: false, error: "Phone number is already registered." });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the customer
    const customer = await Customer.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      phone: phone.trim(),
      walletBalance: 0,
    });

    // Generate JWT Token
    const secretKey = process.env.JWT_SECRET || 'your_super_secret_jwt_key_rapido_2026qefiubkj';
    const token = jwt.sign(
      { id: customer._id, role: "CUSTOMER" },
      secretKey,
      { expiresIn: "30d" }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 🟢 CUSTOMER LOGIN
exports.customerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required." });
    }

    // Find the customer
    const customer = await Customer.findOne({ email: email.trim().toLowerCase() });
    if (!customer) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }

    // Generate JWT Token
    const secretKey = process.env.JWT_SECRET || 'your_super_secret_jwt_key_rapido_2026qefiubkj';
    const token = jwt.sign(
      { id: customer._id, role: "CUSTOMER" },
      secretKey,
      { expiresIn: "30d" }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
