// 💰 PRICING CONFIGURATION
// You can easily adjust these values as your startup grows without touching database logic.
const PRICING = {
    BASE_FARE: 14,       // Minimum fare for the ride
    BASE_DIST: 1,        // Distance covered in base fare (km)
    PLATFORM_FEE: 1,     // Rapido's commission per ride
    TIER_LIMIT: 15,      // Km threshold for tier 1 vs tier 2 pricing
    RATE_TIER_1: 7.5,    // Per km rate up to the TIER_LIMIT
    RATE_TIER_2: 10.5    // Per km rate for anything beyond the TIER_LIMIT
};

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula. 
 * @returns {Number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * (Math.PI / 180)) * 
              Math.cos(lat2 * (Math.PI / 180)) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
              
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
};

/**
 * Calculates the total ride fare based on the total distance.
 * @returns {Object} { rideFare, finalFare, platformFee }
 */
const calculateTotalBill = (distKm, dynamicPricing = PRICING) => {
    let variableFare = 0;

    if (distKm <= dynamicPricing.BASE_DIST) {
        // Just going down the street (under 1km)
        variableFare = dynamicPricing.BASE_FARE;
        
    } else if (distKm <= dynamicPricing.TIER_LIMIT) {
        // Standard ride (1km to 15km)
        const distInTier1 = distKm - dynamicPricing.BASE_DIST;
        variableFare = dynamicPricing.BASE_FARE + (distInTier1 * dynamicPricing.RATE_TIER_1);
        
    } else {
        // Long distance ride (15km+)
        const distInTier1 = dynamicPricing.TIER_LIMIT - dynamicPricing.BASE_DIST; 
        const distInTier2 = distKm - dynamicPricing.TIER_LIMIT;
        
        variableFare = dynamicPricing.BASE_FARE + 
                      (distInTier1 * dynamicPricing.RATE_TIER_1) + 
                      (distInTier2 * dynamicPricing.RATE_TIER_2);
    }

    // We round up (ceil) to the nearest whole number so you don't end up charging ₹45.32
    const rideFare = Math.ceil(variableFare);
    const finalFare = rideFare + dynamicPricing.PLATFORM_FEE;
    
    return { 
        rideFare, 
        finalFare, 
        platformFee: dynamicPricing.PLATFORM_FEE 
    };
};

module.exports = { 
    PRICING, 
    calculateDistance, 
    calculateTotalBill 
};