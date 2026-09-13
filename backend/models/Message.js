const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },
  customerPhone: {
    type: String,
    required: true,
    trim: true
  },
  customerName: {
    type: String,
    trim: true,
    default: ''
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true
  },
  messageType: {
    type: String,
    default: 'custom',
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  // Telnyx message ID for tracking
  telnyxMessageId: {
    type: String,
    default: null
  },
  // Status of the message
  status: {
    type: String,
    enum: ['sent', 'delivered', 'failed', 'received'],
    default: 'sent'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
messageSchema.index({ restaurantId: 1, createdAt: -1 });
messageSchema.index({ bookingId: 1 });
messageSchema.index({ customerPhone: 1, createdAt: -1 });
messageSchema.index({ restaurantId: 1, customerPhone: 1 });

// TTL index to automatically remove old messages after 30 days (2,592,000 seconds)
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('Message', messageSchema);
