const express = require('express');
const router = express.Router();
const {
  requestLoginOTP,
  verifyLoginOTP,
  getSettings,
  updateSettings,
  getDashboardData,
  updateTables,
  updateTableStatus,
  updateLogo,
  createWalkIn,
  getMessages
} = require('../controllers/restaurantController');
const { authenticateUser } = require('../middleware/auth');
const upload = require('../config/aws');

// Public routes
router.post('/request-login-otp', requestLoginOTP);
router.post('/verify-login-otp', verifyLoginOTP);

// Token validation endpoint
router.get('/me', authenticateUser, (req, res) => {
  if (req.user.role === 'superadmin' || !req.user.restaurant) {
    return res.json({
      restaurantId: req.user.restaurantId || null,
      phone: req.user.phone || req.user.superAdmin?.email || '',
      role: req.user.role || 'superadmin',
      restaurant: req.user.restaurant ? {
        id: req.user.restaurant._id,
        name: req.user.restaurant.name,
        city: req.user.restaurant.city,
        email: req.user.restaurant.email,
        phone: req.user.restaurant.phone,
        logo: req.user.restaurant.logo
      } : null,
      superAdmin: req.user.superAdmin ? {
        id: req.user.superAdmin._id,
        email: req.user.superAdmin.email
      } : null
    });
  }

  res.json({
    restaurantId: req.user.restaurantId,
    phone: req.user.phone,
    role: req.user.role,
    restaurant: {
      id: req.user.restaurant._id,
      name: req.user.restaurant.name,
      city: req.user.restaurant.city,
      email: req.user.restaurant.email,
      phone: req.user.restaurant.phone,
      logo: req.user.restaurant.logo
    }
  });
});

// Protected routes (require JWT)
router.get('/:restaurantId/settings', authenticateUser, getSettings);
router.put('/:restaurantId/settings', authenticateUser, updateSettings);
router.get('/:restaurantId/dashboard', authenticateUser, getDashboardData);
router.put('/:restaurantId/tables', authenticateUser, updateTables);
router.patch('/table/:tableId/status', authenticateUser, updateTableStatus);
router.post('/:restaurantId/logo', authenticateUser, upload.single('logo'), updateLogo);
router.get('/:restaurantId/messages', authenticateUser, getMessages);

// Create Walk-in (Quick Seat)
router.post('/walk-in', authenticateUser, createWalkIn);

module.exports = router;
