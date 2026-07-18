const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    profilePic: {
      type: String,
      default: "",
    },
    bikeNumber: {
      type: String,
      required: true,
    },
    licenseNumber: {
      type: String,
      default: "",
    },
    // 🟢 The GeoJSON Magic: This replaces driver.location.latitude/longitude
    currentLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      // IMPORTANT: MongoDB stores coordinates in [Longitude, Latitude] order!
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    licenseFrontPic: {
      type: String,
      default: "",
    },
    licenseBackPic: {
      type: String,
      default: "",
    },
    rcFrontPic: {
      type: String,
      default: "",
    },
    rcBackPic: {
      type: String,
      default: "",
    },
    aadharFrontPic: {
      type: String,
      default: "",
    },
    aadharBackPic: {
      type: String,
      default: "",
    },
    pushToken: {
      type: String,
      default: "",
    },
    vehicleType: {
      type: String,
      enum: ["BIKE", "AUTO", "CAR"],
      default: "BIKE",
    },
    isParcelActive: {
      type: Boolean,
      default: true,
    },
    isBikeTaxiActive: {
      type: Boolean,
      default: true,
    },
    permitPic: {
      type: String,
      default: "",
    },
    insurancePic: {
      type: String,
      default: "",
    },
    fitnessPic: {
      type: String,
      default: "",
    },
    maxPickupDist: {
      type: Number,
      default: 5, // Default 5km radius from your Firebase preferences logic
    },
    walletBalance: {
      type: Number,
      default: 0,
    },
    todayEarnings: {
      type: Number,
      default: 0,
    },
    totalRides: {
      type: Number,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 1.0,
      max: 5.0,
    },
  },
  {
    timestamps: true,
  },
);

// 🚀 THIS IS THE SECRET WEAPON
// This index tells MongoDB to optimize this collection specifically for map-based radius searches.
driverSchema.index({ currentLocation: "2dsphere" });

module.exports = mongoose.model("Driver", driverSchema);
