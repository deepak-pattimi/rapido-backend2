const express = require('express');
const router = express.Router();
const { verifyAdminSecret } = require('../middlewares/auth');
const { rechargeWallet } = require('../controllers/walletController');

// Secure wallet recharge to prevent public bypass exploits
router.post('/recharge', verifyAdminSecret, rechargeWallet);

module.exports = router;