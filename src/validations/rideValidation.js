const { z } = require("zod");

const bookRideSchema = z.object({
  pickup: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  drop: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  pickupAddress: z.string().min(3),
  dropAddress: z.string().min(3),
  pickupName: z.string().optional(),
  dropName: z.string().optional(),
  pickupVillage: z.string().optional(),
  dropVillage: z.string().optional(),
  distance: z.union([z.string(), z.number()]),
  isParcel: z.boolean().optional(),
});

const calculateFareSchema = z.object({
  pickup: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  drop: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  distance: z.union([z.string(), z.number()]).optional(),
});

const acceptRideSchema = z.object({
  rideId: z.string(),
  driverLocation: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
});

const completeRideSchema = z.object({
  rideId: z.string(),
  dropLat: z.number().min(-90).max(90),
  dropLng: z.number().min(-180).max(180),
  dropAddress: z.string().optional(),
});

const updateLocationSchema = z.object({
  driverLocation: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
});

const nearbyDriversSchema = z.object({
  latitude: z.union([z.number(), z.string()]),
  longitude: z.union([z.number(), z.string()]),
  vehicleType: z.string().optional(),
});

module.exports = { bookRideSchema, calculateFareSchema, acceptRideSchema, completeRideSchema, updateLocationSchema, nearbyDriversSchema };