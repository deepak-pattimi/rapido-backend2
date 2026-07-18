const { Expo } = require('expo-server-sdk');
const Driver = require('../models/Driver');
const Customer = require('../models/Customer');

// Initialize the Expo Push Notification SDK
const expo = new Expo();

// 🟢 1. NOTIFY NEARBY DRIVERS (Using MongoDB $near map math)
const notifyNearbyDrivers = async (rideId, rideData) => {
    try {
        console.log(`🔔 Searching for drivers near Ride: ${rideId}`);
        const { pickup, fare } = rideData;
        
        if (!pickup || !pickup.coordinates) return;

        // Remember: MongoDB uses [Longitude, Latitude]
        const pickupLng = pickup.coordinates[0];
        const pickupLat = pickup.coordinates[1];

        // 🚀 THE MAGIC QUERY: Let MongoDB do the heavy lifting!
        // We only fetch online drivers, with a valid push token, within a 10km absolute maximum radius.
        const nearbyDrivers = await Driver.find({
            isOnline: true,
            status: "APPROVED",
            pushToken: { $ne: "", $exists: true }, 
            currentLocation: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [pickupLng, pickupLat]
                    },
                    $maxDistance: 10000 // 10,000 meters = 10km max search radius
                }
            }
        });

        if (nearbyDrivers.length === 0) {
            console.log("📭 No online drivers found in the area.");
            return;
        }

        let messages = [];

        // Loop through the drivers MongoDB found for us
        nearbyDrivers.forEach(driver => {
            // Check if the Expo token is valid format
            if (!Expo.isExpoPushToken(driver.pushToken)) return;

            // Optional: If the driver has a custom max distance preference (e.g., only wants rides within 3km)
            // We can check it here. (Assuming driver.maxPickupDist is stored in KM).
            // MongoDB $near is so good, we don't even need to calculate the exact distance again unless we want to display it.
            const driverMaxRange = driver.maxPickupDist || 5; 

            messages.push({
                to: driver.pushToken,
                sound: 'default',
                title: '🚖 NEW RIDE REQUEST',
                body: `Trip: ₹${fare} • Tap to view location`,
                data: { rideId: rideId, type: 'new_order' },
                priority: 'high',
                channelId: 'default', 
            });
        });

        // Expo requires us to send notifications in "chunks" (batches) so we don't overload Apple/Google servers
        if (messages.length > 0) {
            let chunks = expo.chunkPushNotifications(messages);
            for (let chunk of chunks) {
                try {
                    await expo.sendPushNotificationsAsync(chunk);
                } catch (error) {
                    console.error("❌ Error sending Expo chunk:", error);
                }
            }
            console.log(`✅ Sent push notifications to ${messages.length} drivers.`);
        }

    } catch (error) {
        console.error("❌ Notification Error (Drivers):", error);
    }
};

// 🟢 2. NOTIFY CUSTOMER (When a driver accepts the ride)
const notifyCustomer = async (customerId, driverName) => {
    try {
        // Find the customer in MongoDB
        const customer = await Customer.findById(customerId);
        
        if (!customer) return;

        const pushToken = customer.pushToken;

        // Verify they have a valid Expo token
        if (pushToken && Expo.isExpoPushToken(pushToken)) {
            console.log(`🔔 Notifying Customer: ${customerId}`);
            
            await expo.sendPushNotificationsAsync([{
                to: pushToken,
                sound: 'default',
                title: '🚖 Driver Found!',
                body: `${driverName} is on the way to pick you up.`,
                data: { type: 'driver_found' },
                priority: 'high'
            }]);
        }
    } catch (error) {
        console.error("❌ Customer Notification Error:", error);
    }
};

// 🟢 3. NOTIFY CUSTOMER GENERIC (For Arrivals, Completions, Cancellations)
const notifyCustomerGeneric = async (customerId, title, body, type = 'update') => {
    try {
        const customer = await Customer.findById(customerId);
        if (!customer) return;

        const pushToken = customer.pushToken;
        if (pushToken && Expo.isExpoPushToken(pushToken)) {
            await expo.sendPushNotificationsAsync([{
                to: pushToken,
                sound: 'default',
                title: title,
                body: body,
                data: { type },
                priority: 'high'
            }]);
        }
    } catch (error) {
        console.error("❌ Customer Notification Error:", error);
    }
};

module.exports = { notifyNearbyDrivers, notifyCustomer, notifyCustomerGeneric };