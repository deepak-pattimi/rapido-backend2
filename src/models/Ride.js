const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema(
  {
    // 🔗 Foreign Keys linking to your other collections
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null, // Null until a driver accepts the ride
    },

    // 📸 Snapshot of Driver Details (Saved at the exact moment of acceptance)
    driverName: { type: String, default: "" },
    driverPhone: { type: String, default: "" },
    driverBike: { type: String, default: "" },
    driverPic: { type: String, default: "" },
    driverDL: { type: String, default: "" },
    driverRating: { type: Number, default: 0 },
    driverTotalRides: { type: Number, default: 0 },
    driverTotalReviews: { type: Number, default: 0 },
    
    // 🚙 Ride Type
    requestedVehicleType: {
      type: String,
      enum: ["BIKE", "AUTO", "CAR"],
      default: "BIKE",
    },

    // 📍 Location Data (Remember: MongoDB uses [Longitude, Latitude]!)
    pickup: {
      name: { type: String, default: "Current Location" },
      address: { type: String, default: "Selected on Map" },
      villageName: { type: String, default: "" },
      coordinates: { type: [Number], required: true },
    },
    dropoff: {
      name: { type: String, default: "Drop Location" },
      address: { type: String, default: "Selected on Map" },
      villageName: { type: String, default: "" },
      coordinates: { type: [Number], required: true },
    },
    actualPickup: {
      address: { type: String, default: "" },
      coordinates: { type: [Number], default: [] },
    },
    actualDropoff: {
      address: { type: String, default: "" },
      coordinates: { type: [Number], default: [] },
    },
    driverLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },

    // 🚦 Ride State Machine
    status: {
      type: String,
      enum: [
        "SCHEDULED",
        "REQUESTED",
        "ACCEPTED",
        "ARRIVED",
        "ONGOING",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "REQUESTED",
    },

    // 🗓️ Scheduling
    isScheduled: { type: Boolean, default: false },
    scheduledTime: { type: Date },
    
    // 📦 Parcel Contacts
    isParcel: { type: Boolean, default: false },
    senderName: { type: String, default: "" },
    senderPhone: { type: String, default: "" },
    receiverName: { type: String, default: "" },
    receiverPhone: { type: String, default: "" },

    // 💰 Financials & Receipts (Populated when the ride is completed)
    fare: { type: Number, default: 0 }, // Total billed to customer
    rideFareOnly: { type: Number, default: 0 }, // Base + Distance fare
    platformFee: { type: Number, default: 0 }, // Rapido's commission
    commissionCharged: { type: Number, default: 0 }, // Exact amount deducted from driver wallet
    driverNetEarning: { type: Number, default: 0 }, // What the driver actually keeps

    // 📏 Analytics
    actualDistance: { type: String, default: "0" },

    // ⏱️ Custom Timestamps
    acceptedAt: { type: Date },
    endTime: { type: Date },
    // 🔐 One-time OTP for driver pickup verification
    otp: { type: String, default: "" },

    // ⭐ Reviews
    isReviewed: { type: Boolean, default: false },
    customerRating: { type: Number },
    customerReview: { type: String },
  },
  {
    timestamps: true, // Automatically handles `createdAt` (Ride Requested Time) and `updatedAt`
  },
);

rideSchema.index({ "pickup.coordinates": "2dsphere" });
rideSchema.index({ customerId: 1, status: 1 });
rideSchema.index({ driverId: 1, createdAt: -1 });

module.exports = mongoose.model("Ride", rideSchema);
