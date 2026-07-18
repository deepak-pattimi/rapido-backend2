const Customer = require('../models/Customer');

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

// 🟢 UPDATE PROFILE (Name, Phone, or Push Token)
exports.updateProfile = async (req, res) => {
    try {
        const { name, phone, pushToken } = req.body;
        
        const updateData = {};
        if (name) updateData.name = name;
        if (phone) updateData.phone = phone;
        if (pushToken) updateData.pushToken = pushToken;

        const customer = await Customer.findByIdAndUpdate(
            req.user.id,
            updateData,
            { new: true }
        );
        
        res.json({ success: true, customer });
    } catch (error) {
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