const mongoose = require("mongoose");

const configSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // e.g., 'pricing', 'platform_fee'
  value: { type: mongoose.Schema.Types.Mixed, required: true }, // The settings object
});

module.exports = mongoose.model("Config", configSchema);