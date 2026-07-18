const jwt = require('jsonwebtoken');
const Driver = require('../models/Driver');

const verifyToken = (req, res, next) => {
    // 1. Grab the token from the request header (Format: "Bearer <token>")
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split('Bearer ')[1];

    // 2. If there is no token, kick them out immediately
    if (!token) {
        return res.status(401).json({ error: 'Access Denied: No Token Provided' });
    }

    try {
        // 3. Verify the token using your super secret key from the .env file
        const secretKey = process.env.JWT_SECRET || 'your_super_secret_jwt_key_rapido_2026qefiubkj';
        const verifiedUser = jwt.verify(token, secretKey);
        
        // 4. Attach the decoded user payload (which will contain their uid) to the request
        req.user = verifiedUser;
        
        // 5. Move on to the actual controller logic
        next();
    } catch (error) {
        // If the token is fake, tampered with, or expired, block the request
        return res.status(403).json({ error: 'Security Alert: Invalid or Expired Token' });
    }
};

const verifyApprovedDriver = async (req, res, next) => {
    try {
        const driver = await Driver.findById(req.user.id);
        if (!driver) {
            return res.status(404).json({ error: 'Driver not found' });
        }
        if (driver.status !== 'APPROVED') {
            return res.status(403).json({ error: 'Access Denied: Your partner account is not approved or is suspended.' });
        }
        req.driver = driver; // Attach full driver document to req for efficiency!
        next();
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const verifyAdminSecret = (req, res, next) => {
    const adminSecret = req.headers['x-admin-secret'];
    const expectedSecret = process.env.ADMIN_SECRET || 'rapido_super_secret_admin_key_2026';
    if (!adminSecret || adminSecret !== expectedSecret) {
        return res.status(401).json({ error: 'Access Denied: Invalid Admin Secret' });
    }
    next();
};

module.exports = { verifyToken, verifyApprovedDriver, verifyAdminSecret };