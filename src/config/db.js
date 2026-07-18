const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // This connects to the MONGO_URI string we put in your .env file
        const conn = await mongoose.connect(process.env.MONGO_URI);

        console.log(`🟢 MongoDB Atlas Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        
        // If the server can't connect to the database, it's safer to crash the app 
        // completely rather than run a ride-hailing app with a broken database.
        process.exit(1); 
    }
};

module.exports = connectDB;