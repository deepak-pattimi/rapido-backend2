const Customer = require("../models/Customer");
const Driver = require("../models/Driver");
const Ride = require("../models/Ride");

const normalizeCustomer = (customer) => ({
  id: customer._id,
  name: customer.name,
  phone: customer.phone,
  email: customer.email || "",
  walletBalance: customer.walletBalance || 0,
  status: customer.isActive === false ? "BLOCKED" : "ACTIVE",
  createdAt: customer.createdAt,
  updatedAt: customer.updatedAt,
});

const normalizeDriver = (driver) => ({
  id: driver._id,
  name: driver.name,
  phone: driver.phone,
  bikeNumber: driver.bikeNumber,
  profilePic: driver.profilePic || "",
  status: driver.status || (driver.isOnline ? "APPROVED" : "PENDING"),
  isOnline: driver.isOnline,
  rating: driver.rating || 5.0,
  walletBalance: driver.walletBalance || 0,
  licenseNumber: driver.licenseNumber || "",
  currentLocation: driver.currentLocation || { coordinates: [0, 0] },
  licenseFrontPic: driver.licenseFrontPic || "",
  licenseBackPic: driver.licenseBackPic || "",
  rcFrontPic: driver.rcFrontPic || "",
  rcBackPic: driver.rcBackPic || "",
  aadharFrontPic: driver.aadharFrontPic || "",
  aadharBackPic: driver.aadharBackPic || "",
  createdAt: driver.createdAt,
  updatedAt: driver.updatedAt,
});

exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json({ success: true, customers: customers.map(normalizeCustomer) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    await Customer.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateCustomerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const isActive = status !== "BLOCKED";
    const customer = await Customer.findByIdAndUpdate(
      id,
      { isActive },
      { new: true },
    );
    if (!customer)
      return res
        .status(404)
        .json({ success: false, error: "Customer not found" });
    res.json({ success: true, customer: normalizeCustomer(customer) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCustomerRides = async (req, res) => {
  try {
    const { id } = req.params;
    const rides = await Ride.find({ customerId: id }).sort({ createdAt: -1 });
    res.json({ success: true, rides });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find().sort({ createdAt: -1 });
    res.json({ success: true, drivers: drivers.map(normalizeDriver) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await Driver.findById(id);
    if (!driver)
      return res
        .status(404)
        .json({ success: false, error: "Driver not found" });
    res.json({ success: true, driver: normalizeDriver(driver) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = {};
    const body = req.body;

    if (typeof body.walletBalance !== "undefined")
      allowed.walletBalance = Number(body.walletBalance) || 0;
    if (typeof body.phone !== "undefined") allowed.phone = body.phone;
    if (typeof body.status !== "undefined") {
      allowed.status = body.status;
      if (body.status === "REJECTED") allowed.isOnline = false;
    }
    if (typeof body.isOnline !== "undefined")
      allowed.isOnline = Boolean(body.isOnline);

    const driver = await Driver.findByIdAndUpdate(id, allowed, { new: true });
    if (!driver)
      return res
        .status(404)
        .json({ success: false, error: "Driver not found" });
    res.json({ success: true, driver: normalizeDriver(driver) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getDriverRides = async (req, res) => {
  try {
    const { id } = req.params;
    const rides = await Ride.find({ driverId: id })
      .populate("customerId", "name phone")
      .sort({ createdAt: -1 });

    const formattedRides = rides.map((ride) => {
      const rideObj = ride.toObject();
      if (rideObj.customerId) {
        rideObj.userName = rideObj.customerId.name || "Customer";
        rideObj.userPhone = rideObj.customerId.phone || "";
      }
      return rideObj;
    });

    res.json({ success: true, rides: formattedRides });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const fs = require("fs");
const path = require("path");

exports.getLogs = async (req, res) => {
  try {
    const logFilePath = path.join(__dirname, "../../logs/combined.log");
    if (!fs.existsSync(logFilePath)) {
      return res.json({ success: true, logs: [] });
    }
    
    const content = fs.readFileSync(logFilePath, "utf8");
    const formattedLogs = content
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return { message: line, timestamp: new Date(), level: "info" };
        }
      })
      .reverse() // Newest logs first!
      .slice(0, 200); // Limit to last 200 log statements for speed

    res.json({ success: true, logs: formattedLogs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
