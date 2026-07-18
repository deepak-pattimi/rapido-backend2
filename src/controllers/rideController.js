const asyncHandler = require("../utils/asyncHandler");
const Ride = require("../models/Ride");
const Driver = require("../models/Driver");
const Config = require("../models/Config"); // 🟢 Import Config model
const { calculateDistance, calculateTotalBill } = require("../utils/pricing");
const { notifyCustomer } = require("../services/pushService");

// 🟢 Helper to get dynamic pricing from DB
const getPricingConfig = async () => {
  const config = await Config.findOne({ key: "pricing" });
  // Default values if no config found in DB
  return config ? config.value : {
    BASE_FARE: 14,
    BASE_DIST: 1,
    PLATFORM_FEE: 1,
    TIER_LIMIT: 15,
    RATE_TIER_1: 7.5,
    RATE_TIER_2: 10.5,
    AUTO_MULTIPLIER: 1.5,
    CAR_MULTIPLIER: 2.0
  };
};

exports.calculateFare = asyncHandler(async (req, res) => {
    const { pickup, drop, distance } = req.body;
    if (!pickup || !drop) return res.status(400).json({ error: "Missing coordinates" });

    // 1. Fetch dynamic pricing from DB
    const PRICING = await getPricingConfig();

    // 2. Calculate
    let distKm = distance ? parseFloat(distance) : calculateDistance(pickup.latitude, pickup.longitude, drop.latitude, drop.longitude);

    // 3. Pass PRICING object into your existing utility logic (ensure utility handles the passed object)
    const { finalFare } = calculateTotalBill(distKm, PRICING);
    
    // Calculate vehicle specific fares based on dynamic multipliers
    const autoMultiplier = PRICING.AUTO_MULTIPLIER || 1.5;
    const carMultiplier = PRICING.CAR_MULTIPLIER || 2.0;

    const fares = {
      BIKE: finalFare,
      AUTO: Math.round(finalFare * autoMultiplier),
      CAR: Math.round(finalFare * carMultiplier)
    };

    res.json({ success: true, fare: finalFare, fares: fares, distance: distKm.toFixed(2) });
  });

exports.acceptRide = asyncHandler(async (req, res) => {
    const { rideId, driverLocation } = req.body;
    const driverId = req.user.id;

    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ error: "Driver not found" });

    if ((driver.walletBalance || 0) <= -30) {
      return res.status(403).json({ error: "Low Balance. Please Recharge." });
    }

    const ride = await Ride.findOneAndUpdate(
      { _id: rideId, status: "REQUESTED" },
      {
        status: "ACCEPTED",
        driverId: driverId,
        driverName: driver.name,
        driverPhone: driver.phone,
        driverBike: driver.bikeNumber || "",
        driverPic: driver.profilePic || "",
        driverDL: driver.licenseNumber || "",
        driverRating: driver.rating || 5.0,
        driverTotalRides: driver.totalRides || 0,
        driverLocation: driverLocation && driverLocation.longitude ? { type: "Point", coordinates: [driverLocation.longitude, driverLocation.latitude] } : { type: "Point", coordinates: [0, 0] },
        acceptedAt: new Date(),
      },
      { new: true },
    );

    if (!ride) return res.status(400).json({ error: "Ride is no longer available or already accepted." });

    const io = req.app.get("io");
    io.to(ride.customerId.toString()).emit("rideStatusUpdate", ride);

    await notifyCustomer(ride.customerId, driver.name);

    res.json({ success: true });
  });

exports.completeRide = asyncHandler(async (req, res) => {
    const { rideId, dropLat, dropLng, dropAddress } = req.body;
    const driverId = req.user.id;

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ error: "Ride not found" });

    if (ride.driverId.toString() !== driverId) return res.status(403).json({ error: "Security Alert: Not your ride!" });
    if (ride.status !== "ONGOING") return res.status(400).json({ error: "Security Alert: Ride is not ongoing. Did you forget to start it?" });

    // 🟢 Fetch dynamic pricing for final billing
    const PRICING = await getPricingConfig();
    const pickupLng = ride.pickup.coordinates[0];
    const pickupLat = ride.pickup.coordinates[1];

    const distKm = calculateDistance(pickupLat, pickupLng, dropLat, dropLng);
    const { rideFare, finalFare, platformFee } = calculateTotalBill(distKm, PRICING);
    
    // Apply vehicle multiplier from DB config (Security Patch)
    const reqVehicle = ride.requestedVehicleType || "BIKE";
    const autoMult = PRICING.AUTO_MULTIPLIER || 1.5;
    const carMult = PRICING.CAR_MULTIPLIER || 2.0;
    const multiplier = reqVehicle === "CAR" ? carMult : reqVehicle === "AUTO" ? autoMult : 1.0;
    
    const adjustedFinalFare = Math.round(finalFare * multiplier);
    const adjustedPlatformFee = Math.round(platformFee * multiplier);
    const driverNet = adjustedFinalFare - adjustedPlatformFee;

    ride.status = "COMPLETED";
    ride.fare = adjustedFinalFare;
    ride.rideFareOnly = Math.round(rideFare * multiplier);
    ride.platformFee = adjustedPlatformFee;
    ride.actualDistance = distKm.toFixed(2);
    ride.commissionCharged = adjustedPlatformFee;
    ride.driverNetEarning = driverNet;
    if (dropAddress) {
      ride.actualDropoff = {
        address: dropAddress,
        coordinates: [dropLng, dropLat]
      };
    } else {
      ride.actualDropoff = {
        address: "",
        coordinates: [dropLng, dropLat]
      };
    }
    ride.endTime = new Date();

    await ride.save();

    await Driver.findByIdAndUpdate(driverId, {
      $inc: { todayEarnings: driverNet, totalRides: 1, walletBalance: -adjustedPlatformFee },
    });

    const io = req.app.get("io");
    io.to(ride.customerId.toString()).emit("rideStatusUpdate", ride);

    res.json({ success: true, message: "Ride Completed", ride });
  });

exports.getRideHistory = asyncHandler(async (req, res) => {
    if (req.user.id !== req.params.userId) return res.status(403).json({ success: false, error: "Unauthorized access" });
    const history = await Ride.find({ customerId: req.params.userId })
        .populate("driverId", "licenseNumber")
        .sort({ createdAt: -1 })
        .limit(20);
    res.json({ success: true, history });
  });

exports.bookRide = asyncHandler(async (req, res) => {
    const { pickup, drop, pickupAddress, dropAddress, distance, vehicleType } = req.body;
    const customerId = req.user.id;
    
    // Security Patch: Check if customer already has an active ride
    const existingRide = await Ride.findOne({
      customerId,
      status: { $in: ["SCHEDULED", "REQUESTED", "ACCEPTED", "ARRIVED", "ONGOING"] }
    });
    if (existingRide) {
      return res.status(400).json({ error: "You already have an active ride!" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    const PRICING = await getPricingConfig();
    const distKm = Number.parseFloat(distance);
    const bookedDistance = Number.isFinite(distKm)
      ? distKm
      : calculateDistance(pickup.latitude, pickup.longitude, drop.latitude, drop.longitude);
    const { finalFare } = calculateTotalBill(bookedDistance, PRICING);
    
    // Apply vehicle multiplier from DB config
    const reqVehicle = vehicleType || "BIKE";
    const autoMult = PRICING.AUTO_MULTIPLIER || 1.5;
    const carMult = PRICING.CAR_MULTIPLIER || 2.0;
    const multiplier = reqVehicle === "CAR" ? carMult : reqVehicle === "AUTO" ? autoMult : 1.0;
    const adjustedFare = Math.round(finalFare * multiplier);

    const isScheduledBooking = req.body.isScheduled === true || req.body.isScheduled === "true";
    const rideStatus = isScheduledBooking ? "SCHEDULED" : "REQUESTED";

    const newRide = await Ride.create({
      customerId,
      pickup: { address: pickupAddress, coordinates: [pickup.longitude, pickup.latitude] },
      dropoff: { address: dropAddress, coordinates: [drop.longitude, drop.latitude] },
      fare: adjustedFare,
      actualDistance: bookedDistance.toFixed(2),
      status: rideStatus,
      isScheduled: isScheduledBooking,
      scheduledTime: isScheduledBooking && req.body.scheduledTime ? new Date(req.body.scheduledTime) : undefined,
      otp,
      requestedVehicleType: reqVehicle,
      isParcel: req.body.isParcel === true || req.body.isParcel === "true",
    });

    const io = req.app.get("io");
    io.emit("newRideAvailable");

    res.status(200).json({ success: true, rideId: newRide._id, otp });
  });

exports.getRideStatus = asyncHandler(async (req, res) => {
    const rideId = req.params.rideId;
    const ride = await Ride.findById(rideId).populate("customerId", "name phone").lean();
    if (!ride) return res.status(404).json({ error: "Ride not found" });

    // Format fields for the frontend
    if (ride.customerId) {
      ride.userName = ride.customerId.name || "Customer";
      ride.customerPhone = ride.customerId.phone || "";
    }
    
    res.json(ride);
  });

// Return the active ride for the authenticated customer if any
exports.currentRide = asyncHandler(async (req, res) => {
    const customerId = req.user.id;
    const ride = await Ride.findOne({
      customerId,
      status: { $in: ["SCHEDULED", "REQUESTED", "ACCEPTED", "ARRIVED", "ONGOING"] },
    }).sort({ createdAt: -1 });

    res.json({ success: true, ride: ride || null });
  });

exports.cancelRide = asyncHandler(async (req, res) => {
    const { rideId } = req.body;
    const customerId = req.user.id;

    const ride = await Ride.findOneAndUpdate(
      { _id: rideId, customerId, status: { $in: ["SCHEDULED", "REQUESTED", "ACCEPTED"] } },
      { status: "CANCELLED" },
      { new: true },
    );

    if (!ride) return res.status(400).json({ error: "Cannot cancel this ride." });

    if (ride.driverId) {
      const io = req.app.get("io");
      io.to(ride.driverId.toString()).emit("rideStatusUpdate", ride);
    }

    res.json({ success: true, message: "Ride cancelled" });
  });

exports.availableRides = asyncHandler(async (req, res) => {
    const { driverLat, driverLng, maxDistance } = req.body;
    if (typeof driverLat !== "number" || typeof driverLng !== "number") return res.status(400).json({ error: "Driver location required" });

    const driver = await Driver.findById(req.user.id);
    if (!driver) return res.status(404).json({ error: "Driver not found" });

    const distanceMeters = (Number(maxDistance) || 7) * 1000;
    
    const query = {
      status: "REQUESTED",
      requestedVehicleType: driver.vehicleType || "BIKE",
      "pickup.coordinates": {
        $near: {
          $geometry: { type: "Point", coordinates: [driverLng, driverLat] },
          $maxDistance: distanceMeters,
        },
      },
    };

    if (driver.isParcelActive === false) {
      query.isParcel = { $ne: true };
    } else if (driver.isBikeTaxiActive === false) {
      query.isParcel = true;
    }

    const rides = await Ride.find(query).limit(20);

    res.json({ success: true, rides });
  });

exports.cancelRideByDriver = asyncHandler(async (req, res) => {
    const { rideId } = req.body;
    const driverId = req.user.id;

    const ride = await Ride.findOneAndUpdate(
      { _id: rideId, driverId: driverId, status: { $in: ["ACCEPTED", "ARRIVED", "ONGOING"] } },
      { 
        status: "REQUESTED", 
        driverId: null, 
        driverName: "", 
        driverPhone: "", 
        driverBike: "", 
        driverPic: "", 
        acceptedAt: null,
        driverLocation: { type: "Point", coordinates: [0, 0] }
      },
      { new: true },
    );

    if (!ride) return res.status(400).json({ error: "Could not cancel this ride." });

    const io = req.app.get("io");
    io.to(ride.customerId.toString()).emit("rideStatusUpdate", ride);

    res.json({ success: true, ride });
  });

exports.startRide = asyncHandler(async (req, res) => {
    const { rideId, otp, pickupLat, pickupLng, pickupAddress } = req.body;
    const driverId = req.user.id;
    const ride = await Ride.findById(rideId);

    if (!ride) return res.status(404).json({ error: "Ride not found" });
    if (!ride.driverId || ride.driverId.toString() !== driverId) return res.status(403).json({ error: "Unauthorized driver" });
    if (ride.status !== "ACCEPTED") return res.status(400).json({ error: "Ride must be accepted before starting" });
    if (ride.otp !== otp) return res.status(400).json({ error: "Invalid OTP" });

    // Update with actual exact pickup coordinates and address if provided
    if (pickupLat && pickupLng && pickupAddress) {
      ride.actualPickup = {
        coordinates: [pickupLng, pickupLat],
        address: pickupAddress
      };
    }

    ride.status = "ONGOING";
    ride.updatedAt = new Date();
    await ride.save();

    const io = req.app.get("io");
    io.to(ride.customerId.toString()).emit("rideStatusUpdate", ride);

    res.json({ success: true, ride });
  });

exports.updateRideLocation = asyncHandler(async (req, res) => {
    const { rideId } = req.params;
    const { driverLocation } = req.body;
    const driverId = req.user.id;

    if (!driverLocation || typeof driverLocation.latitude !== "number" || typeof driverLocation.longitude !== "number") {
      return res.status(400).json({ error: "Valid driverLocation required" });
    }

    const ride = await Ride.findOneAndUpdate(
      { _id: rideId, driverId: driverId, status: { $in: ["ACCEPTED", "ONGOING"] } },
      { driverLocation: { type: "Point", coordinates: [driverLocation.longitude, driverLocation.latitude] } },
      { new: true },
    );

    if (!ride) return res.status(404).json({ error: "Ride not found or not assigned to driver" });

    const io = req.app.get("io");
    io.to(ride.customerId.toString()).emit("driverLocationUpdate", driverLocation);

    res.json({ success: true, ride });
  });

exports.getNearbyDrivers = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;
  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "Latitude and longitude are required" });
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  const query = {
    isOnline: true,
  };

  const dbDrivers = await Driver.find(query);

  let nearby = dbDrivers.map(d => {
    const coords = d.currentLocation?.coordinates || [0, 0];
    const driverLng = coords[0];
    const driverLat = coords[1];
    const dist = calculateDistance(lat, lng, driverLat, driverLng);
    return {
      id: d._id.toString(),
      name: d.name,
      phone: d.phone,
      bikeNumber: d.bikeNumber,
      vehicleType: d.vehicleType,
      rating: d.rating || 5.0,
      coordinates: { latitude: driverLat, longitude: driverLng },
      distance: parseFloat(dist.toFixed(2)) // in km
    };
  });

  // If there are no online drivers, generate mock AUTO and CAR drivers (no BIKE) to allow testing the switch flow
  if (nearby.length === 0) {
    const mockNames = ["Ramesh Kumar", "Vijay Singh"];
    const mockVehicles = ["AUTO", "CAR"];
    const mockBikes = ["AP31-AB-1234", "AP31-XY-5678"];
    const mockPhones = ["9876543210", "8765432109"];

    nearby = mockNames.map((name, i) => {
      const latOffset = (Math.random() - 0.5) * 0.015;
      const lngOffset = (Math.random() - 0.5) * 0.015;
      const driverLat = lat + latOffset;
      const driverLng = lng + lngOffset;
      const dist = calculateDistance(lat, lng, driverLat, driverLng);

      return {
        id: `mock-driver-${i}`,
        name,
        phone: mockPhones[i],
        bikeNumber: mockBikes[i],
        vehicleType: mockVehicles[i],
        rating: parseFloat((4.5 + Math.random() * 0.5).toFixed(1)),
        coordinates: { latitude: driverLat, longitude: driverLng },
        distance: parseFloat(dist.toFixed(2)) // in km
      };
    });
  }

  res.json({ success: true, drivers: nearby });
});

exports.skipSchedule = asyncHandler(async (req, res) => {
    const { rideId } = req.body;
    const customerId = req.user.id;
    const ride = await Ride.findOneAndUpdate(
      { _id: rideId, customerId, status: "SCHEDULED" },
      { status: "REQUESTED", isScheduled: false, scheduledTime: null },
      { new: true }
    );
    
    if (!ride) return res.status(400).json({ error: "Cannot skip schedule." });
    
    // Notify drivers that a new immediate ride is available
    const io = req.app.get("io");
    io.emit("newRideAvailable");
    
    // Also notify the customer that status updated
    io.to(ride.customerId.toString()).emit("rideStatusUpdate", ride);

    res.json({ success: true, ride });
});

exports.submitReview = asyncHandler(async (req, res) => {
    const { rideId } = req.params;
    const { rating, review } = req.body;
    const customerId = req.user.id;

    if (!rating) return res.status(400).json({ error: "Rating is required" });

    const ride = await Ride.findOne({ _id: rideId, customerId: customerId, status: "COMPLETED" });
    if (!ride) return res.status(404).json({ error: "Ride not found or not completed" });
    if (ride.isReviewed) return res.status(400).json({ error: "Ride already reviewed" });

    ride.isReviewed = true;
    ride.customerRating = rating;
    ride.customerReview = review || "";
    await ride.save();

    if (ride.driverId) {
      const driver = await Driver.findById(ride.driverId);
      if (driver) {
        const totalReviews = driver.totalReviews || 0;
        const currentRating = driver.rating || 5.0;
        const newTotalReviews = totalReviews + 1;
        const newRating = ((currentRating * totalReviews) + Number(rating)) / newTotalReviews;

        driver.totalReviews = newTotalReviews;
        driver.rating = parseFloat(newRating.toFixed(1));
        await driver.save();
      }
    }

    res.json({ success: true, message: "Review submitted successfully" });
});
