const express = require('express');
const router = express.Router();
const {
  login,
  getRestaurants,
  addRestaurant,
  toggleRestaurantStatus,
  deleteRestaurant,
  requestPasswordResetOTP,
  resetPasswordWithOTP,
  approveTrial,
  declineTrial
} = require('../controllers/superAdminController');
const {
  getRevenueStats,
  getSubscriptionStats,
  getRecentPayments,
  getRevenueBreakdown,
  exportAnalytics
} = require('../controllers/analyticsController');
const { authenticateSuperAdmin } = require('../middleware/auth');
const { validateRestaurantData } = require('../middleware/validation');

// Public routes
router.post('/login', login);
router.post('/request-password-reset-otp', requestPasswordResetOTP);
router.post('/reset-password-with-otp', resetPasswordWithOTP);

// Protected routes - Restaurant Management
router.get('/restaurants', authenticateSuperAdmin, getRestaurants);
router.post('/restaurants', authenticateSuperAdmin, validateRestaurantData, addRestaurant);
router.patch('/restaurants/:restaurantId/toggle-status', authenticateSuperAdmin, toggleRestaurantStatus);
router.post('/restaurants/:restaurantId/approve-trial', authenticateSuperAdmin, approveTrial);
router.post('/restaurants/:restaurantId/decline-trial', authenticateSuperAdmin, declineTrial);
router.delete('/restaurants/:restaurantId', authenticateSuperAdmin, deleteRestaurant);

// Protected routes - Analytics
router.get('/analytics/revenue', authenticateSuperAdmin, getRevenueStats);
router.get('/analytics/subscriptions', authenticateSuperAdmin, getSubscriptionStats);
router.get('/analytics/payments', authenticateSuperAdmin, getRecentPayments);
router.get('/analytics/breakdown', authenticateSuperAdmin, getRevenueBreakdown);
router.get('/analytics/export', authenticateSuperAdmin, exportAnalytics);

module.exports = router;