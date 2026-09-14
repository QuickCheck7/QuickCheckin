const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerPhone: {
    type: String,
    required: true,
    trim: true
  },
  partySize: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['waiting', 'notified', 'confirmed', 'seated', 'completed', 'cancelled', 'noshow'],
    default: 'waiting'
  },
  waitTime: {
    type: Number,
    default: 0
  },
  estimatedSeatingTime: {
    type: Date
  },
  // Table assignment
  tableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table',
    default: null
  },
  // Timing tracking
  checkInTime: {
    type: Date,
    default: Date.now
  },
  notificationSentAt: {
    type: Date
  },
  confirmationReceivedAt: {
    type: Date
  },
  seatedAt: {
    type: Date
  },
  expectedEndTime: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  cancellationReason: {
    type: String,
    trim: true
  },
  // Custom party flag (for large parties that need staff assistance)
  isCustomParty: {
    type: Boolean,
    default: false
  },
  // Language preference for SMS (captured from kiosk language at booking time)
  language: {
    type: String,
    enum: ['en', 'fr'],
    default: 'en'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
bookingSchema.index({ restaurantId: 1, status: 1 });
bookingSchema.index({ restaurantId: 1, createdAt: -1 });
bookingSchema.index({ customerPhone: 1 });
bookingSchema.index({ estimatedSeatingTime: 1 });
bookingSchema.index({ tableId: 1, status: 1 });

// TTL index to automatically remove old bookings after 48 hours
bookingSchema.index({ createdAt: 1 }, { expireAfterSeconds: 172800 });

module.exports = mongoose.model('Booking', bookingSchema);
