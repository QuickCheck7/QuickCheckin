const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  postalCode: {
    type: String,
    trim: true,
    default: ''
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  businessNumber: {
    type: String,
    required: true,
    trim: true
  },
  logo: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Geographic & Registration (for Stripe subscriptions)
  country: {
    type: String,
    enum: ['US', 'CA', null],
    default: null // Legacy restaurants won't have this
  },
  state: {
    type: String,
    default: null // State/Province - optional
  },
  // Subscription & Billing
  stripeCustomerId: {
    type: String,
    unique: true,
    sparse: true // Allows multiple null/undefined for legacy restaurants
  },
  stripeSubscriptionId: {
    type: String,
    unique: true,
    sparse: true
  },
  subscriptionStatus: {
    type: String,
    enum: ['trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'legacy-free', 'pending_approval'],
    default: 'legacy-free' // Default for existing restaurants
  },
  subscriptionPlan: {
    type: String,
    enum: ['small', 'large', 'legacy-free'],
    default: 'legacy-free' // Default for existing restaurants
  },
  seatCapacity: {
    type: Number,
    min: 1,
    default: null // Will be set during signup or migration
  },
  pendingPlanChange: {
    type: String,
    enum: ['small', 'large', null],
    default: null // For scheduled downgrades
  },
  subscriptionStartDate: {
    type: Date,
    default: null
  },
  subscriptionEndDate: {
    type: Date,
    default: null // For trial end or cancellation
  },
  lastPaymentDate: {
    type: Date,
    default: null
  },
  nextBillingDate: {
    type: Date,
    default: null
  },
  signupSource: {
    type: String,
    enum: ['self-service', 'super-admin'],
    default: 'super-admin' // Existing restaurants are admin-created
  },
  firstLoginAt: {
    type: Date,
    default: null
  },
  avgWaitTime: {
    type: Number,
    default: 0
  },
  // Waitlist Configuration
  gracePeriodMinutes: {
    type: Number,
    default: 15,
    min: 5,
    max: 60
  },
  reminderDelayMinutes: {
    type: Number,
    default: 7,
    min: 3,
    max: 30
  },
  // Allowed party sizes for this restaurant
  allowedPartySizes: {
    type: [Number],
    default: [1, 2, 3, 4, 5, 6, 7, 8]
  },
  // SMS Templates
  smsTemplates: {
    tableReady: {
      type: String,
      default: 'Hi {name}! Your table for {partySize} at {restaurant} is ready. Please arrive within {gracePeriod} minutes. Reply Y to confirm or N to cancel.'
    },
    reminder: {
      type: String,
      default: 'Reminder: Your table at {restaurant} is still waiting! Please reply Y (Yes) or N (No) to confirm.'
    },
    cancelled: {
      type: String,
      default: 'Hi {name}, your reservation at {restaurant} has been cancelled. We hope to see you another time!'
    },
    confirmation: {
      type: String,
      default: 'Hi {name}, your table for {partySize} is confirmed at {restaurant}. Estimated wait: {waitTime} minutes.'
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin',
    required: false, // NOW OPTIONAL for self-service signups
    default: null
  }
}, {
  timestamps: true
});

// Index for better query performance
restaurantSchema.index({ isActive: 1, city: 1 });
restaurantSchema.index({ email: 1 }, { unique: true });
restaurantSchema.index({ businessNumber: 1 }, { unique: true });

module.exports = mongoose.model('Restaurant', restaurantSchema);
