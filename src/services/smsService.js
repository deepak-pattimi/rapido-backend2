const axios = require('axios');

const sendSMS = async (phone, otp) => {
    try {
        // Format clean phone number (10 digits or +91 format)
        let cleanPhone = phone.toString().trim();
        // Remove spaces and non-numeric characters except +
        cleanPhone = cleanPhone.replace(/[^\d+]/g, '');
        if (cleanPhone.startsWith('+91')) {
            cleanPhone = cleanPhone.replace('+91', '');
        } else if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
            cleanPhone = cleanPhone.substring(2);
        }

        const accountSid = process.env.EXOTEL_ACCOUNT_SID || 'inryde1';
        const apiKey = process.env.EXOTEL_API_KEY || 'd262c35c2b1224a4942ce29251e903f081b972b8eca9fbbe';
        const apiToken = process.env.EXOTEL_API_TOKEN || '9c546ea44cd495012d1b2e1c1487203c8a4d7e0bc6a61b42';
        const senderId = process.env.EXOTEL_SENDER_ID || 'INRYDE';
        const dltEntityId = process.env.EXOTEL_DLT_ENTITY_ID || '1701176415453788305';
        const dltTemplateId = process.env.EXOTEL_DLT_TEMPLATE_ID || '1707176422482094693';

        const url = `https://api.exotel.com/v1/Accounts/${accountSid}/Sms/send.json`;

        // DLT approved message template format:
        // "INRYDE: Your booking OTP is {#var#}. Use this to confirm your ride. OTP valid for {#var#} minutes."
        const messageBody = `INRYDE: Your booking OTP is ${otp}. Use this to confirm your ride. OTP valid for 10 minutes.`;

        const params = new URLSearchParams();
        params.append('From', senderId);
        params.append('To', cleanPhone);
        params.append('Body', messageBody);
        params.append('DltEntityId', dltEntityId);
        params.append('DltTemplateId', dltTemplateId);

        const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiToken}`).toString('base64');

        console.log(`📡 Sending Exotel OTP to ${cleanPhone}...`);

        const response = await axios.post(url, params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': authHeader
            }
        });

        console.log("📨 Exotel SMS Response:", response.data);
        return response.data;
    } catch (error) {
        console.error("❌ Exotel SMS Gateway Error:", error.response?.data || error.message);
        throw new Error("Failed to send SMS via Exotel: " + (error.response?.data?.RestException?.Message || error.message));
    }
};

module.exports = { sendSMS };