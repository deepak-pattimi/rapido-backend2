const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const { getProfile, updateProfile, getSavedPlaces, addSavedPlace, deleteSavedPlace } = require('../controllers/customerController');

router.get('/profile', verifyToken, getProfile);
router.put('/update-profile', verifyToken, updateProfile);

// 🟢 Saved Places Endpoints
router.get('/saved-places', verifyToken, getSavedPlaces);
router.post('/saved-places', verifyToken, addSavedPlace);
router.delete('/saved-places/:placeId', verifyToken, deleteSavedPlace);

module.exports = router;