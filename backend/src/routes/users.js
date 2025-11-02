const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  getPreferences,
  updatePreferences,
  getUserByUsername
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const {
  validateUpdateProfile,
  validateUpdatePreferences
} = require('../middleware/validators');

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, validateUpdateProfile, updateProfile);
router.get('/preferences', protect, getPreferences);
router.put('/preferences', protect, validateUpdatePreferences, updatePreferences);

// Public routes
router.get('/:username', getUserByUsername);

module.exports = router;
