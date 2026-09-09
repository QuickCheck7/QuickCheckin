const jwt = require('jsonwebtoken');
const Restaurant = require('../models/Restaurant');
const Session = require('../models/Session');
const SubscriptionHistory = require('../models/SubscriptionHistory');
const generateOTP = require('../utils/otpGenerator');
const { sendSMS, formatPhoneNumber } = require('../utils/telnyxService');
const {
  getPriceForRestaurant,
  createStripeCustomer,
  createStripeSubscription,
  stripe
} = require('../utils/stripeService');

// Request OTP for restaurant admin login
const requestLoginOTP = async (req, res) => {
  try {
    const { restaurantId, phone } = req.body;

    if (!restaurantId || !phone) {
      return res.status(400).json({ message: 'Restaurant ID and phone number are required.' });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ message: 'Restaurant not found or inactive.' });
    }

    // Check if phone matches restaurant's registered phone
    const cleanedPhone = phone.replace(/\D/g, '');
    const cleanedRestaurantPhone = restaurant.phone.replace(/\D/g, '');

    if (cleanedPhone !== cleanedRestaurantPhone) {
      return res.status(401).json({ message: 'Phone number does not match restaurant records.' });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Save session with OTP
    await Session.findOneAndUpdate(
      { restaurantId, phone },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    // Send OTP via SMS
    const formattedPhone = formatPhoneNumber(phone);
    const message = `QuickCheck: Your verification code is ${otp}. Enter it on the screen to proceed.`;

    const smsResult = await sendSMS(formattedPhone, message);

    if (!smsResult.success) {
      return res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
    }

    res.json({ message: 'OTP sent successfully to your phone number' });
  } catch (error) {
    console.error('Request login OTP error:', error);
    res.status(500).json({ message: 'Server error sending OTP.' });
  }
};

// Verify OTP for restaurant admin login
const verifyLoginOTP = async (req, res) => {
  try {
    const { restaurantId, phone, otp } = req.body;

    if (!restaurantId || !phone || !otp) {
      return res.status(400).json({ message: 'Restaurant ID, phone number, and OTP are required.' });
    }

    // Normalize phone number - try multiple formats
    const phoneVariations = [
      phone,
      decodeURIComponent(phone),
      phone.replace(/\s/g, ''),
      phone.replace(/[^\d+]/g, ''),
    ];
    
    // Debug logging
    console.log('[OTP Verify] Looking for session with:', { restaurantId, otp, phoneVariations });
    
    // First, find session by restaurantId and otp (most reliable)
    const session = await Session.findOne({ restaurantId, otp });
    
    if (!session) {
      console.log('[OTP Verify] No session found for this restaurantId and otp');
      // Check if any session exists for this restaurant
      const anySessions = await Session.find({ restaurantId });
      console.log('[OTP Verify] All sessions for this restaurant:', anySessions.length);
      if (anySessions.length > 0) {
        console.log('[OTP Verify] Session phones:', anySessions.map(s => s.phone));
        console.log('[OTP Verify] Session OTPs:', anySessions.map(s => s.otp));
      }
      return res.status(400).json({ message: 'Invalid OTP.' });
    }
    
    // Verify that the phone matches (with normalization)
    const sessionPhoneNormalized = session.phone.replace(/[^\d+]/g, '');
    const requestPhoneNormalized = phone.replace(/[^\d+]/g, '');
    
    if (sessionPhoneNormalized !== requestPhoneNormalized) {
      console.log('[OTP Verify] Phone mismatch:', { sessionPhone: session.phone, requestPhone: phone });
      return res.status(400).json({ message: 'Phone number does not match.' });
    }

    if (session.expiresAt < new Date()) {
      await Session.findByIdAndDelete(session._id);
      return res.status(400).json({ message: 'OTP has expired.' });
    }

    // Get restaurant details
    const restaurant = await Restaurant.findById(restaurantId);

    // Delete used session
    await Session.findByIdAndDelete(session._id);

    // Create JWT session token (same as regular login)
    const sessionToken = jwt.sign(
      {
        restaurantId,
        phone,
        role: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Login successful',
      sessionToken,
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        city: restaurant.city,
        email: restaurant.email,
        phone: restaurant.phone,
        logo: restaurant.logo
      }
    });
  } catch (error) {
    console.error('Verify login OTP error:', error);
    res.status(500).json({ message: 'Server error verifying OTP.' });
  }
};

// Validate session token
const validateSession = async (req, res, next) => {
  try {
    const { restaurantId, sessionToken } = req.body;

    if (!restaurantId || !sessionToken) {
      return res.status(400).json({ message: 'Restaurant ID and session token are required.' });
    }

    const session = await Session.findOne({
      restaurantId,
      otp: sessionToken,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      return res.status(401).json({ message: 'Invalid or expired session.' });
    }

    // Extend session expiration
    session.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await session.save();

    req.restaurantId = restaurantId;
    next();
  } catch (error) {
    console.error('Validate session error:', error);
    res.status(500).json({ message: 'Server error validating session.' });
  }
};

// Logout - invalidate session
const logout = async (req, res) => {
  try {
    const { restaurantId, sessionToken } = req.body;

    await Session.deleteOne({ restaurantId, otp: sessionToken });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout.' });
  }
};

/**
 * Verify if business number is available
 * GET /api/auth/verify-business-number?number=XX-XXXXX&country=US
 */
// Function to validate Canadian BN using Luhn algorithm
const isValidCanadianBN = (bn) => {
  if (!/^\d{9}$/.test(bn)) return false;
  
  let sum = 0;
  // Alternate weights 2 and 1 for the first 8 digits
  const weights = [2, 1, 2, 1, 2, 1, 2, 1];
  
  for (let i = 0; i < 8; i++) {
    let digit = parseInt(bn[i]) * weights[i];
    // If double digits, sum the digits (e.g. 16 -> 1 + 6 = 7)
    if (digit > 9) digit = digit - 9;
    sum += digit;
  }
  
  // Calculate check digit (9th digit)
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(bn[8]);
};

const verifyBusinessNumber = async (req, res) => {
  try {
    const { number, country } = req.query;

    if (!number || !country) {
      return res.status(400).json({ message: 'Business number and country are required.' });
    }

    // Validate format
    const cleanNumber = number.trim().replace(/[^0-9]/g, '');
    
    if (!['US', 'CA'].includes(country)) {
      return res.status(400).json({ message: 'Country must be US or CA.' });
    }

    // Both US EIN and CA BN are 9 digits
    if (cleanNumber.length !== 9) {
      return res.status(400).json({ 
        message: country === 'US' 
          ? 'EIN must be 9 digits' 
          : 'Business Number must be 9 digits' 
      });
    }

    // Mathematical checksum for Canada
    if (country === 'CA' && !isValidCanadianBN(cleanNumber)) {
      return res.status(400).json({ message: 'Invalid Canadian Business Number format.' });
    }

    // Check if the business is already registered to handle trial eligibility
    const existing = await Restaurant.findOne({ businessNumber: cleanNumber });
    
    res.json({ available: true, hasUsedTrial: !!existing });
  } catch (error) {
    console.error('Verify business number error:', error);
    res.status(500).json({ message: 'Server error verifying business number.' });
  }
};

/**
 * Restaurant Self-Service Signup
 * POST /api/auth/signup
 */
const signup = async (req, res) => {
  try {
    const {
      restaurantName,
      country,
      state,
      city,
      address,
      postalCode,
      businessNumber,
      email,
      phone,
      seatCapacity,
      paymentMethodId // Stripe payment method ID from frontend
    } = req.body;

    // Validation
    if (!restaurantName || !country || !city || !address || !postalCode || !businessNumber || !email || !phone || !seatCapacity || !paymentMethodId) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    if (!['US', 'CA'].includes(country)) {
      return res.status(400).json({ message: 'Country must be US or CA.' });
    }

    if (seatCapacity < 1) {
      return res.status(400).json({ message: 'Seat capacity must be at least 1.' });
    }

    // Check business number uniqueness BEFORE Stripe
    // Identity Lock: Normalize business number (remove dashes/spaces)
    const cleanBusinessNumber = businessNumber.trim().replace(/[^0-9]/g, '');
    
    // Both US EIN and CA BN are 9 digits
    if (cleanBusinessNumber.length !== 9) {
      return res.status(400).json({ 
        message: country === 'US' 
          ? 'EIN must be 9 digits' 
          : 'Business Number must be 9 digits' 
      });
    }

    // Mathematical checksum for Canada
    if (country === 'CA' && !isValidCanadianBN(cleanBusinessNumber)) {
      return res.status(400).json({ message: 'Invalid Canadian Business Number format.' });
    }
    
    // Check for existing business number (using normalized version)
    // We search for both raw input AND normalized version to be safe, 
    // though DB should ideally store normalized.
    const existing = await Restaurant.findOne({ 
      $or: [
        { businessNumber: cleanBusinessNumber },
        { businessNumber: businessNumber.trim() }
      ]
    });

    const hasUsedTrial = !!existing;

    // Check email uniqueness
    const existingEmail = await Restaurant.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({ message: 'This email is already registered.' });
    }

    // Payment Lock: Validate Key Card Country Matches Selected Country
    try {
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      const cardCountry = paymentMethod.card.country; // e.g., 'US', 'CA'

      // Check for currency cheating
      if (country === 'CA' && cardCountry !== 'CA') {
        return res.status(400).json({ 
          message: 'Payment Lock: you selected Canada (CAD pricing), but your card was not issued in Canada. Please use a Canadian card or select United States.' 
        });
      }

      if (country === 'US' && cardCountry !== 'US') {
        return res.status(400).json({ 
          message: 'Payment Lock: You selected United States, but your card was not issued in the US. Please use a US card.' 
        });
      }
    } catch (stripeError) {
      console.error('Stripe payment method retrieval error:', stripeError);
      return res.status(400).json({ message: 'Invalid payment method details.' });
    }

    // Get pricing based on seat capacity
    const { priceId, plan, amount, currency } = getPriceForRestaurant(country, seatCapacity);

    // Create Stripe Customer
    const customerResult = await createStripeCustomer({
      email: email.toLowerCase(),
      name: restaurantName,
      phone: formatPhoneNumber(phone),
      metadata: {
        businessNumber: cleanBusinessNumber, // Save properly normalized ID
        country,
        state: state || '',
        city,
        seatCapacity: seatCapacity.toString()
      }
    });

    if (!customerResult.success) {
      return res.status(500).json({ message: 'Payment processing error. Please try again.' });
    }

    const { customer } = customerResult;

    // Attach payment method to customer
    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id
      });

      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });
    } catch (error) {
      console.error('Payment method attach error:', error);
      // Clean up: delete the customer
      await stripe.customers.del(customer.id);
      return res.status(400).json({ message: 'Invalid payment method. Please try again.' });
    }

    let subscription = null;
    let periodEnd = null;

    if (!hasUsedTrial) {
      // Create Stripe Subscription immediately only if they get a trial
      const subscriptionResult = await createStripeSubscription({
        customerId: customer.id,
        priceId,
        trialDays: 30
      });

      if (!subscriptionResult.success) {
        // Clean up customer
        await stripe.customers.del(customer.id);
        return res.status(500).json({ message: 'Subscription creation failed. Please try again.' });
      }
      subscription = subscriptionResult.subscription;
      periodEnd = subscription.trial_end || subscription.current_period_end;
    }

    // Create Restaurant in database
    const restaurant = new Restaurant({
      name: restaurantName,
      country,
      state,
      city,
      address,
      postalCode,
      businessNumber: cleanBusinessNumber, // Store ONLY the normalized ID
      email: email.toLowerCase(),
      phone,
      seatCapacity,
      subscriptionPlan: plan,
      subscriptionStatus: hasUsedTrial ? 'pending_approval' : 'trialing',
      stripeCustomerId: customer.id,
      stripeSubscriptionId: subscription ? subscription.id : undefined,
      subscriptionStartDate: new Date(),
      subscriptionEndDate: periodEnd ? new Date(periodEnd * 1000) : undefined,
      nextBillingDate: periodEnd ? new Date(periodEnd * 1000) : undefined,
      signupSource: 'self-service',
      isActive: !hasUsedTrial, // Pending approval means not active yet
      createdBy: null
    });

    await restaurant.save();

    // Log subscription history
    await SubscriptionHistory.create({
      restaurantId: restaurant._id,
      action: hasUsedTrial ? 'pending_approval' : 'trial_started',
      toPlan: plan,
      amount: amount * 100,
      currency,
      stripeSubscriptionId: subscription ? subscription.id : undefined,
      metadata: {
        trialEndDate: subscription ? subscription.trial_end : undefined,
        seatCapacity
      }
    });

    // Send welcome SMS
    const welcomeMsg = hasUsedTrial 
      ? `Welcome to QuickCheck! Your account is under review for the free trial. We will notify you shortly.` 
      : `Welcome to QuickCheck! Your 30-day free trial has started. Reply HELP for support.`;
    await sendSMS(formatPhoneNumber(phone), welcomeMsg);

    // Generate OTP for login
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const session = new Session({
      restaurantId: restaurant._id,
      phone,
      role: 'admin',
      otp,
      expiresAt
    });
    await session.save();

    // Send OTP
    const otpMsg = `Your QuickCheck login OTP is: ${otp}. Valid for 10 minutes.`;
    await sendSMS(formatPhoneNumber(phone), otpMsg);

    res.status(201).json({
      message: 'Signup successful! OTP sent to your phone.',
      restaurantId: restaurant._id,
      trialEndDate: subscription ? subscription.trial_end : undefined,
      plan,
      amount,
      currency
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      message: 'Server error during signup. Please try again.',
      error: error.message || 'Unknown error'
    });
  }
};

module.exports = {
  requestLoginOTP,
  verifyLoginOTP,
  validateSession,
  logout,
  verifyBusinessNumber,
  signup
};