const axios = require('axios');

const sendSMS = async (phone, otp) => {
    try {
        // Strip the +91 because Authkey handles country_code separately
        const cleanPhone = phone.replace('+91', '');
        
        const AUTH_KEY = process.env.AUTHKEY_API_KEY;
        const SID = process.env.AUTHKEY_SID;
        const COMPANY_NAME = "Rapido"; 

        const url = `https://api.authkey.io/request?authkey=${AUTH_KEY}&mobile=${cleanPhone}&country_code=91&sid=${SID}&company=${COMPANY_NAME}&otp=${otp}`;

        const response = await axios.get(url);
        console.log("📨 Authkey Response:", response.data);
        
        return response.data;
    } catch (error) {
        console.error("❌ SMS Gateway Error:", error.message);
        throw new Error("Failed to send SMS via Authkey");
    }
};

module.exports = { sendSMS };