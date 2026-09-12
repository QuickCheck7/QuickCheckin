const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/SuperAdmin');
const Restaurant = require('../models/Restaurant');

// Verify Super Admin JWT token
const authenticateSuperAdmin = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    let token = authHeader?.replace(/^Bearer\s+/i, '')?.trim();
    
    if (!token) {
      token = req.query?.token || req.headers['x-auth-token'] || req.headers['x-session-token'];
    }
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const superAdmin = await SuperAdmin.findById(decoded.id);
    
    if (!superAdmin) {
      return res.status(401).json({ message: 'Token is not valid.' });
    }
    
    req.superAdmin = superAdmin;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid.', error: error.message });
  }
};

// Verify User (Restaurant Admin/Guest) JWT token
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    let token = authHeader?.replace(/^Bearer\s+/i, '')?.trim();
    
    if (!token) {
      token = req.query?.token || req.headers['x-auth-token'] || req.headers['x-session-token'];
    }
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Case 1: Restaurant Admin/Guest token
    if (decoded.restaurantId) {
      const restaurant = await Restaurant.findById(decoded.restaurantId);
      if (!restaurant || !restaurant.isActive) {
        return res.status(401).json({ message: 'Restaurant not found or inactive.' });
      }
      
      req.user = {
        restaurantId: decoded.restaurantId,
        phone: decoded.phone,
        role: decoded.role || 'admin',
        restaurant
      };
      
      return next();
    }

    // Case 2: Super Admin token accessing restaurant resources
    if (decoded.id) {
      const superAdmin = await SuperAdmin.findById(decoded.id);
      if (superAdmin && superAdmin.isActive) {
        const targetRestaurantId = req.params.restaurantId || req.body.restaurantId || req.query.restaurantId;
        const restaurant = targetRestaurantId ? await Restaurant.findById(targetRestaurantId) : null;
        req.user = {
          restaurantId: targetRestaurantId || null,
          role: 'superadmin',
          superAdmin,
          restaurant
        };
        req.superAdmin = superAdmin;
        return next();
      }
    }
    
    return res.status(401).json({ message: 'Token is not valid.' });
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid.', error: error.message });
  }
};

// Verify Restaurant Admin session
const authenticateRestaurantAdmin = async (req, res, next) => {
  try {
    const { restaurantId, sessionToken } = req.body;

    if (!restaurantId || !sessionToken) {
      return res.status(400).json({ message: 'Restaurant ID and session token are required.' });
    }

    const Session = require('../models/Session');
    const session = await Session.findOne({
      restaurantId,
      otp: sessionToken,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      return res.status(401).json({ message: 'Invalid or expired session.' });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ message: 'Restaurant not found or inactive.' });
    }

    req.restaurant = restaurant;
    req.session = session;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error during authentication.' });
  }
};

module.exports = {
  authenticateSuperAdmin,
  authenticateUser,
  authenticateRestaurantAdmin
};