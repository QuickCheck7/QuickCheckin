const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/SuperAdmin');
const Restaurant = require('../models/Restaurant');
const Otp = require('../models/Otp');
const generateOTP = require('../utils/otpGenerator');
const { sendSMS, formatPhoneNumber } = require('../utils/telnyxService');

// Super Admin Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    
    const superAdmin = await SuperAdmin.findOne({ email, isActive: true });
    if (!superAdmin) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    
    const isPasswordValid = await superAdmin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    
    // Update last login
    superAdmin.lastLogin = new Date();
    await superAdmin.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { id: superAdmin._id, email: superAdmin.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    
    res.json({
      message: 'Login successful',
      token,
      superAdmin: {
        id: superAdmin._id,
        email: superAdmin.email,
        phone: superAdmin.phone
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.', error: error.message || 'Unknown error' });
  }
};

// Get all restaurants
const getRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find()
      .populate('createdBy', 'email')
      .sort({ createdAt: -1 });
    
    res.json({
      count: restaurants.length,
      restaurants
    });
  } catch (error) {
    console.error('Get restaurants error:', error);
    res.status(500).json({ message: 'Server error fetching restaurants.', error: error.message || 'Unknown error' });
  }
};

// Add new restaurant
const addRestaurant = async (req, res) => {
  try {
    const { name, city, email, phone, businessNumber } = req.body;
    
    // Check if restaurant email already exists
    const existingRestaurant = await Restaurant.findOne({ email });
    
    if (existingRestaurant) {
      return res.status(400).json({ 
        message: 'Restaurant with this email already exists.' 
      });
    }
    
    // Create new restaurant
    const restaurant = new Restaurant({
      name,
      city,
      email,
      phone,
      businessNumber,
      createdBy: req.superAdmin._id
    });
    
    await restaurant.save();
    
    res.status(201).json({
      message: 'Restaurant added successfully',
      restaurant
    });
  } catch (error) {
    console.error('Add restaurant error:', error);
    res.status(500).json({ message: 'Server error adding restaurant.', error: error.message || 'Unknown error' });
  }
};

// Toggle restaurant active status
const toggleRestaurantStatus = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found.' });
    }
    
    restaurant.isActive = !restaurant.isActive;
    await restaurant.save();
    
    res.json({
      message: `Restaurant ${restaurant.isActive ? 'activated' : 'deactivated'} successfully`,
      restaurant
    });
  } catch (error) {
    console.error('Toggle restaurant status error:', error);
    res.status(500).json({ message: 'Server error toggling restaurant status.', error: error.message || 'Unknown error' });
  }
};

// Delete restaurant
const deleteRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found.' });
    }
    
    await Restaurant.findByIdAndDelete(restaurantId);
    
    res.json({ message: 'Restaurant deleted successfully' });
  } catch (error) {
    console.error('Delete restaurant error:', error);
    res.status(500).json({ message: 'Server error deleting restaurant.', error: error.message || 'Unknown error' });
  }
};

// Request OTP for password reset
const requestPasswordResetOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }
    
    const superAdmin = await SuperAdmin.findOne({ email, isActive: true });
    if (!superAdmin) {
      return res.status(404).json({ message: 'Super admin not found with this email.' });
    }
    
    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    
    // Save OTP to database
    await Otp.findOneAndUpdate(
      { email },
      { otp, expiresAt },
      { upsert: true, new: true }
    );
    
    // Send OTP via SMS
    const formattedPhone = formatPhoneNumber(superAdmin.phone);
    const message = `Your QuickCheck password reset OTP is: ${otp}. It will expire in 10 minutes.`;

    const smsSent = await sendSMS(formattedPhone, message);

    if (!smsSent) {
      return res.status(500).json({ message: 'Failed to send OTP. Please try again.', error: error.message || 'Unknown error' });
    }

    res.json({
      message: 'OTP sent to your registered phone number'
    });
  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({ message: 'Server error generating OTP.', error: error.message || 'Unknown error' });
  }
};

// Reset password with OTP
const resetPasswordWithOTP = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required.' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }
    
    // Verify OTP
    const otpRecord = await Otp.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }
    
    if (otpRecord.expiresAt < new Date()) {
      await Otp.findByIdAndDelete(otpRecord._id);
      return res.status(400).json({ message: 'OTP has expired.' });
    }
    
    // Update password
    const superAdmin = await SuperAdmin.findOne({ email });
    superAdmin.password = newPassword;
    await superAdmin.save();
    
    // Delete used OTP
    await Otp.findByIdAndDelete(otpRecord._id);
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error resetting password.', error: error.message || 'Unknown error' });
  }
};

// Approve Trial
const approveTrial = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { getPriceForRestaurant, createStripeSubscription } = require('../utils/stripeService');
    const SubscriptionHistory = require('../models/SubscriptionHistory');

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found.' });

    if (restaurant.subscriptionStatus !== 'pending_approval') {
      return res.status(400).json({ message: 'Restaurant is not pending approval.' });
    }

    const { priceId } = getPriceForRestaurant(restaurant.country, restaurant.subscriptionPlan);
    const subscriptionResult = await createStripeSubscription({
      customerId: restaurant.stripeCustomerId,
      priceId,
      trialDays: 30
    });

    if (!subscriptionResult.success) {
      return res.status(500).json({ message: 'Failed to create subscription in Stripe.', error: error.message || 'Unknown error' });
    }

    const { subscription } = subscriptionResult;
    restaurant.stripeSubscriptionId = subscription.id;
    restaurant.subscriptionStatus = 'trialing';
    restaurant.isActive = true;
    restaurant.subscriptionEndDate = new Date((subscription.trial_end || subscription.current_period_end || (Date.now() / 1000 + 30 * 24 * 60 * 60)) * 1000);
    restaurant.nextBillingDate = new Date((subscription.trial_end || subscription.current_period_end || (Date.now() / 1000 + 30 * 24 * 60 * 60)) * 1000);
    await restaurant.save();

    await SubscriptionHistory.create({
      restaurantId: restaurant._id,
      action: 'trial_approved',
      toPlan: restaurant.subscriptionPlan,
      stripeSubscriptionId: subscription.id,
      metadata: { trialEndDate: subscription.trial_end }
    });

    const msg = `Hey, your admin panel has been approved for the free trial. Now you can use it. You have got the 30 days free trial.`;
    await sendSMS(formatPhoneNumber(restaurant.phone), msg);

    res.json({ message: 'Trial approved successfully.', restaurant });
  } catch (error) {
    console.error('Approve trial error:', error);
    res.status(500).json({ message: 'Server error approving trial.', error: error.message || 'Unknown error' });
  }
};

// Decline Trial
const declineTrial = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { getPriceForRestaurant, createStripeSubscription } = require('../utils/stripeService');
    const SubscriptionHistory = require('../models/SubscriptionHistory');

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found.' });

    if (restaurant.subscriptionStatus !== 'pending_approval') {
      return res.status(400).json({ message: 'Restaurant is not pending approval.' });
    }

    const { priceId } = getPriceForRestaurant(restaurant.country, restaurant.subscriptionPlan);
    const subscriptionResult = await createStripeSubscription({
      customerId: restaurant.stripeCustomerId,
      priceId,
      trialDays: 0 // Immediate charge
    });

    if (!subscriptionResult.success) {
      return res.status(500).json({ message: 'Failed to create subscription in Stripe.', error: error.message || 'Unknown error' });
    }

    const { subscription } = subscriptionResult;
    const periodEnd = subscription.current_period_end || subscription.trial_end || (Date.now() / 1000 + 30 * 24 * 60 * 60);
    
    restaurant.stripeSubscriptionId = subscription.id;
    restaurant.subscriptionStatus = subscription.status;
    restaurant.isActive = (subscription.status === 'active' || subscription.status === 'trialing');
    restaurant.subscriptionEndDate = new Date(periodEnd * 1000);
    restaurant.nextBillingDate = new Date(periodEnd * 1000);
    await restaurant.save();

    await SubscriptionHistory.create({
      restaurantId: restaurant._id,
      action: 'trial_declined_billed',
      toPlan: restaurant.subscriptionPlan,
      stripeSubscriptionId: subscription.id,
    });

    const msg = `Your trial request was declined, but your account is now active. You have been billed according to your selected plan.`;
    await sendSMS(formatPhoneNumber(restaurant.phone), msg);

    res.json({ message: 'Trial declined and account activated.', restaurant });
  } catch (error) {
    console.error('Decline trial error:', error);
    res.status(500).json({ message: 'Server error declining trial.', error: error.message || 'Unknown error' });
  }
};

module.exports = {
  login,
  getRestaurants,
  addRestaurant,
  toggleRestaurantStatus,
  deleteRestaurant,
  requestPasswordResetOTP,
  resetPasswordWithOTP,
  approveTrial,
  declineTrial
};