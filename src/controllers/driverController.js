const Driver = require("../models/Driver");
const Ride = require("../models/Ride");

exports.getDriverProfile = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id);
    if (!driver)
      return res
        .status(404)
        .json({ success: false, error: "Driver not found" });

    res.json({ success: true, driver });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateDriverPreferences = async (req, res) => {
  try {
    const { maxDistance } = req.body;
    const driver = await Driver.findByIdAndUpdate(
      req.user.id,
      { maxPickupDist: Number(maxDistance) || 5 },
      { new: true },
    );

    if (!driver)
      return res
        .status(404)
        .json({ success: false, error: "Driver not found" });
    res.json({ success: true, driver });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getDriverHistory = async (req, res) => {
  try {
    const rides = await Ride.find({ driverId: req.user.id })
      .populate("customerId", "name phone")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, rides });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getDriverEarnings = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id);
    if (!driver)
      return res
        .status(404)
        .json({ success: false, error: "Driver not found" });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const ridesToday = await Ride.aggregate([
      { $match: { driverId: driver._id, status: "COMPLETED", endTime: { $gte: startOfDay } } },
      { $group: { _id: null, total: { $sum: "$driverNetEarning" } } }
    ]);
    const todayEarnings = ridesToday.length > 0 ? ridesToday[0].total : 0;

    res.json({
      success: true,
      earnings: {
        walletBalance: driver.walletBalance,
        todayEarnings: todayEarnings,
        totalRides: driver.totalRides,
        rating: driver.rating,
        isOnline: driver.isOnline,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateDriverLocation = async (req, res) => {
  try {
    const { latitude, longitude, heading } = req.body;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res
        .status(400)
        .json({ success: false, error: "Invalid coordinates" });
    }

    const driver = await Driver.findByIdAndUpdate(
      req.user.id,
      {
        currentLocation: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        heading: heading || 0,
      },
      { new: true },
    );

    if (!driver)
      return res
        .status(404)
        .json({ success: false, error: "Driver not found" });
    res.json({ success: true, driver });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.driverDashboard = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id);
    if (!driver)
      return res
        .status(404)
        .json({ success: false, error: "Driver not found" });

    const currentRide = await Ride.findOne({
      driverId: driver._id,
      status: { $in: ["ACCEPTED", "ARRIVED", "ONGOING"] },
    }).sort({ createdAt: -1 });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const ridesToday = await Ride.aggregate([
      { $match: { driverId: driver._id, status: "COMPLETED", endTime: { $gte: startOfDay } } },
      { $group: { _id: null, total: { $sum: "$driverNetEarning" } } }
    ]);
    const todayEarnings = ridesToday.length > 0 ? ridesToday[0].total : 0;

    res.json({
      success: true,
      driver: {
        ...driver.toObject(),
        todayEarnings: todayEarnings,
        currentRideId: currentRide ? currentRide._id : null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.toggleDriverStatus = async (req, res) => {
  try {
    const { isOnline } = req.body;

    const driver = await Driver.findByIdAndUpdate(
      req.user.id,
      { isOnline: Boolean(isOnline) },
      { new: true },
    );

    if (!driver)
      return res
        .status(404)
        .json({ success: false, error: "Driver not found" });
    res.json({ success: true, driver });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateDriverPushToken = async (req, res) => { try { const { pushToken } = req.body; const driver = await Driver.findByIdAndUpdate(req.user.id, { pushToken }, { new: true }); if (!driver) return res.status(404).json({ success: false, error: 'Driver not found' }); res.json({ success: true, message: 'Push token updated' }); } catch (error) { res.status(500).json({ success: false, error: error.message }); } };

exports.updateDriverServices = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user.id);
    if (!driver)
      return res
        .status(404)
        .json({ success: false, error: "Driver not found" });

    const currentBikeTaxi = driver.isBikeTaxiActive !== false;
    const currentParcel = driver.isParcelActive !== false;

    const isParcelActiveVal = req.body.isParcelActive !== undefined
      ? Boolean(req.body.isParcelActive)
      : currentParcel;
    const isBikeTaxiActiveVal = req.body.isBikeTaxiActive !== undefined
      ? Boolean(req.body.isBikeTaxiActive)
      : currentBikeTaxi;

    if (!isParcelActiveVal && !isBikeTaxiActiveVal) {
      return res
        .status(400)
        .json({ success: false, error: "At least one service must be active." });
    }

    driver.isParcelActive = isParcelActiveVal;
    driver.isBikeTaxiActive = isBikeTaxiActiveVal;
    await driver.save();

    res.json({ success: true, driver });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
