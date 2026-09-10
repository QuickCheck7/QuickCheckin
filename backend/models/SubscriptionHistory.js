const mongoose = require('mongoose');

const subscriptionHistorySchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  action: {
    type: String,
    enum: ['created', 'upgraded', 'downgraded', 'renewed', 'canceled', 'payment_failed', 'payment_succeeded', 'refunded', 'trial_started', 'trial_ending', 'pending_approval', 'trial_approved', 'trial_declined_billed'],
    required: true
  },
  fromPlan: {
    type: String,
    enum: ['small', 'large', 'legacy-free', null],
    default: null
  },
  toPlan: {
    type: String,
    enum: ['small', 'large', 'legacy-free', null],
    default: null
  },
  amount: {
    type: Number,
    default: 0 // In cents
  },
  currency: {
    type: String,
    enum: ['USD', 'CAD'],
    default: 'USD'
  },
  stripeSubscriptionId: {
    type: String,
    default: null
  },
  stripeInvoiceId: {
    type: String,
    default: null
  },
  stripePaymentIntentId: {
    type: String,
    default: null
  },
  stripeChargeId: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
subscriptionHistorySchema.index({ restaurantId: 1, createdAt: -1 });
subscriptionHistorySchema.index({ action: 1, createdAt: -1 });
subscriptionHistorySchema.index({ stripeInvoiceId: 1 });

module.exports = mongoose.model('SubscriptionHistory', subscriptionHistorySchema);
