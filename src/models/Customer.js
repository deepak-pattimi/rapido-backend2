const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    phone: { 
        type: String, 
        required: true, 
        unique: true, // Guarantees no two users can have the same phone number
        trim: true
    },
    email: {
        type: String,
        required: false,
        unique: true,
        sparse: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: false
    },
    name: { 
        type: String, 
        default: "Rapido Rider",
        trim: true
    },
    pushToken: { 
        type: String,
        default: "" // Crucial for your Expo Push Notifications!
    },
    walletBalance: { 
        type: Number, 
        default: 0 
    },
    rating: { 
        type: Number, 
        default: 5.0,
        min: 1.0,
        max: 5.0
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    savedPlaces: [
        {
            label: { type: String, required: true },
            address: { type: String, required: true },
            coords: {
                latitude: { type: Number, required: true },
                longitude: { type: Number, required: true }
            },
            icon: { type: String, default: "location" }
        }
    ]
}, { 
    timestamps: true // This automatically adds `createdAt` and `updatedAt` to every user
});

module.exports = mongoose.model('Customer', customerSchema);