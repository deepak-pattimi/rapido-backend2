const Customer = require('../models/Customer');
const Ride = require('../models/Ride');
const Otp = require('../models/Otp');

// 🟢 GET PROFILE
exports.getProfile = async (req, res) => {
    try {
        // req.user.id comes from your verifyToken JWT middleware!
        const customer = await Customer.findById(req.user.id);
        if (!customer) return res.status(404).json({ error: "Customer not found" });
        
        res.json(customer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 🟢 UPDATE PROFILE (Name, Email, Phone, or Push Token)
exports.updateProfile = async (req, res) => {
    try {
        const { name, email, phone, pushToken } = req.body;
        
        const updateData = {};
        if (name !== undefined) updateData.name = name.trim();
        if (email !== undefined) updateData.email = email.trim();
        if (phone !== undefined) updateData.phone = phone.trim();
        if (pushToken !== undefined) updateData.pushToken = pushToken;

        const customer = await Customer.findByIdAndUpdate(
            req.user.id,
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!customer) return res.status(404).json({ error: "Customer not found" });

        res.json({ success: true, customer });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 🟢 DELETE ACCOUNT
exports.deleteAccount = async (req, res) => {
    try {
        const customerId = req.user.id;
        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ error: "Customer not found" });
        }

        const phone = customer.phone;

        // Cancel any active/ongoing rides
        try {
            await Ride.updateMany(
                { 
                    customerId: customerId, 
                    status: { $in: ['SEARCHING', 'PENDING', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'] } 
                },
                { 
                    status: 'CANCELLED', 
                    cancellationReason: 'Customer account deleted' 
                }
            );
        } catch (rideErr) {
            console.error("Error cancelling rides on account deletion:", rideErr);
        }

        // Remove OTP records associated with user's phone
        if (phone) {
            try {
                await Otp.deleteMany({ phone });
            } catch (otpErr) {
                console.error("Error removing OTP records:", otpErr);
            }
        }

        // Delete the customer record completely
        await Customer.findByIdAndDelete(customerId);

        res.json({ success: true, message: "Account and associated data deleted successfully." });
    } catch (error) {
        console.error("deleteAccount error:", error);
        res.status(500).json({ error: error.message });
    }
};

// 🟢 GET SAVED PLACES
exports.getSavedPlaces = async (req, res) => {
    try {
        const customer = await Customer.findById(req.user.id).select('savedPlaces');
        if (!customer) return res.status(404).json({ error: "Customer not found" });
        
        res.json({ success: true, savedPlaces: customer.savedPlaces || [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 🟢 ADD SAVED PLACE
exports.addSavedPlace = async (req, res) => {
    try {
        const { label, address, coords, icon } = req.body;
        if (!label || !address || !coords || !coords.latitude || !coords.longitude) {
            return res.status(400).json({ error: "Missing required fields (label, address, coords)" });
        }
        
        const customer = await Customer.findById(req.user.id);
        if (!customer) return res.status(404).json({ error: "Customer not found" });

        customer.savedPlaces.push({ label, address, coords, icon: icon || "location" });
        await customer.save();

        res.json({ success: true, savedPlaces: customer.savedPlaces });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 🟢 DELETE SAVED PLACE
exports.deleteSavedPlace = async (req, res) => {
    try {
        const { placeId } = req.params;
        const customer = await Customer.findById(req.user.id);
        if (!customer) return res.status(404).json({ error: "Customer not found" });

        customer.savedPlaces = customer.savedPlaces.filter(place => place._id.toString() !== placeId);
        await customer.save();

        res.json({ success: true, savedPlaces: customer.savedPlaces });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};