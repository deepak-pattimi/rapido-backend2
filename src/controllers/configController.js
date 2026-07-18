const Config = require("../models/Config");

// Fetch settings (Public or Auth-protected)
exports.getConfig = async (req, res) => {
  try {
    const config = await Config.findOne({ key: "pricing" });
    res.json({ success: true, pricing: config ? config.value : null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin only: Update settings
exports.updatePricing = async (req, res) => {
  try {
    const { pricing } = req.body;
    await Config.findOneAndUpdate(
      { key: "pricing" },
      { value: pricing },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: "Pricing updated globally" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};