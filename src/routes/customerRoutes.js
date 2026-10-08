const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const { 
  getProfile, 
  updateProfile, 
  deleteAccount,
  getSavedPlaces, 
  addSavedPlace, 
  deleteSavedPlace 
} = require('../controllers/customerController');

router.get('/profile', verifyToken, getProfile);
router.put('/update-profile', verifyToken, updateProfile);
router.put('/profile/update', verifyToken, updateProfile); // for backwards compatibility
router.delete('/account', verifyToken, deleteAccount);
router.delete('/delete-account', verifyToken, deleteAccount);
router.post('/delete-account', verifyToken, deleteAccount);

// 🟢 Saved Places Endpoints
router.get('/saved-places', verifyToken, getSavedPlaces);
router.post('/saved-places', verifyToken, addSavedPlace);
router.delete('/saved-places/:placeId', verifyToken, deleteSavedPlace);

module.exports = router;