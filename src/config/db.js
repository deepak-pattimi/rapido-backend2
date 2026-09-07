const mongoose = require('mongoose');
const dns = require('dns');

// Force Node.js to prefer IPv4 over IPv6 on Windows to avoid Atlas ENOTFOUND / connection reset errors
dns.setDefaultResultOrder('ipv4first');

const connectDB = async () => {
    try {
        // This connects to the MONGO_URI string we put in your .env file
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            family: 4
        });

        console.log(`🟢 MongoDB Atlas Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        
        // If the server can't connect to the database, it's safer to crash the app 
        // completely rather than run a ride-hailing app with a broken database.
        process.exit(1); 
    }
};

module.exports = connectDB;