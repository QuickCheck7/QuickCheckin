/**
 * Notification Timers - Manages follow-up and auto-cancel timers for customer notifications
 * 
 * When a customer is notified their table is ready:
 * 1. Follow-up Timer (7 min): If no response, send reminder SMS
 * 2. Auto-cancel Timer (20 min): If still no response, cancel booking
 */

const Booking = require('../models/Booking');
const Table = require('../models/Table');
const Message = require('../models/Message');
const { sendSMS } = require('./telnyxService');
const { getSmsTemplate } = require('./smsTemplates');

// Store active timers by bookingId: { followUp: TimeoutId, autoCancel: TimeoutId }
const activeTimers = new Map();

// Timer durations (in milliseconds)
const FOLLOW_UP_DELAY = 7 * 60 * 1000;  // 7 minutes
const AUTO_CANCEL_DELAY = 20 * 60 * 1000; // 20 minutes

// Helper to log SMS to Message model
const logMessage = async (restaurantId, bookingId, customerPhone, customerName, direction, messageType, content) => {
  try {
    const message = new Message({
      restaurantId,
      bookingId,
      customerPhone,
      customerName,
      direction,
      messageType,
      content,
      status: direction === 'outbound' ? 'sent' : 'received'
    });
    await message.save();
    return message;
  } catch (error) {
    console.error('[Timers] Error logging message:', error);
  }
};

/**
 * Start notification timers for a booking
 * @param {string} bookingId - The booking ID to track
 * @param {object} app - Express app instance (for SSE emitter)
 */
const startNotificationTimers = (bookingId, app) => {
  // Cancel any existing timers for this booking
  cancelTimers(bookingId);
  
  console.log(`[Timers] Starting notification timers for booking ${bookingId}`);
  
  const timers = {
    followUp: null,
    autoCancel: null
  };
  
  // Follow-up timer (7 minutes)
  timers.followUp = setTimeout(async () => {
    try {
      const booking = await Booking.findById(bookingId).populate('restaurantId');
      
      // Only send follow-up if still in 'notified' status (no response yet)
      if (booking && booking.status === 'notified') {
        console.log(`[Timers] Sending follow-up SMS for booking ${bookingId}`);
        
        const restaurant = booking.restaurantId;
        const formattedPhone = formatPhoneNumber(booking.customerPhone);
        
        const message = getSmsTemplate('followUp', booking.language || 'en', {
          name: booking.customerName,
          restaurant: restaurant.name
        });
        
        await sendSMS(formattedPhone, message);
        
        // Log the follow-up message
        await logMessage(
          restaurant._id,
          booking._id,
          booking.customerPhone,
          booking.customerName,
          'outbound',
          'reminder',
          message
        );
        
        // Emit SSE event for new message
        const sseEmitter = app.get('sseEmitter');
        if (sseEmitter) {
          sseEmitter.emit('message', {
            restaurantId: restaurant._id,
            type: 'new_message',
            customerPhone: booking.customerPhone
          });
        }
        
        console.log(`[Timers] Follow-up SMS sent for booking ${bookingId}`);
      }
    } catch (error) {
      console.error(`[Timers] Error sending follow-up SMS for booking ${bookingId}:`, error);
    }
  }, FOLLOW_UP_DELAY);
  
  // Auto-cancel timer (20 minutes)
  timers.autoCancel = setTimeout(async () => {
    try {
      const booking = await Booking.findById(bookingId).populate('restaurantId');
      
      // Only auto-cancel if still in 'notified' status (no response received)
      if (booking && booking.status === 'notified') {
        console.log(`[Timers] Auto-cancelling booking ${bookingId} - no response after 20 minutes`);
        
        const restaurant = booking.restaurantId;
        
        // Free up the reserved table
        if (booking.tableId) {
          const table = await Table.findById(booking.tableId);
          if (table) {
            table.status = 'available';
            table.currentBookingId = null;
            await table.save();
            
            // Emit SSE event for table status change
            const sseEmitter = app.get('sseEmitter');
            if (sseEmitter) {
              sseEmitter.emit('table', {
                restaurantId: restaurant._id,
                type: 'status_change',
                table
              });
            }
          }
        }
        
        // Update booking status to cancelled
        booking.status = 'cancelled';
        booking.cancelledAt = new Date();
        booking.cancellationReason = 'No response - auto-cancelled after 20 minutes';
        await booking.save();
        
        // Send cancellation SMS
        const formattedPhone = formatPhoneNumber(booking.customerPhone);
        const message = getSmsTemplate('autoCancel', booking.language || 'en', {
          name: booking.customerName,
          restaurant: restaurant.name
        });
        
        await sendSMS(formattedPhone, message);
        
        // Log the cancellation message with messageType: 'tableReleased'
        await logMessage(
          restaurant._id,
          booking._id,
          booking.customerPhone,
          booking.customerName,
          'outbound',
          'tableReleased',
          message
        );
        
        // Emit SSE events (booking status, wait time, and message event for real-time conversation tab)
        const sseEmitter = app.get('sseEmitter');
        if (sseEmitter) {
          sseEmitter.emit('booking', {
            restaurantId: restaurant._id,
            type: 'status_change',
            booking
          });
          sseEmitter.emit('waitTime', {
            restaurantId: restaurant._id,
            type: 'wait_time_update'
          });
          sseEmitter.emit('message', {
            restaurantId: restaurant._id,
            type: 'new_message',
            customerPhone: booking.customerPhone
          });
        }
        
        console.log(`[Timers] Booking ${bookingId} auto-cancelled successfully`);
      }
    } catch (error) {
      console.error(`[Timers] Error auto-cancelling booking ${bookingId}:`, error);
    } finally {
      // Clean up timer entry
      activeTimers.delete(bookingId);
    }
  }, AUTO_CANCEL_DELAY);
  
  // Store the timers
  activeTimers.set(bookingId, timers);
};

/**
 * Cancel all active timers for a booking
 * @param {string} bookingId - The booking ID
 */
const cancelTimers = (bookingId) => {
  const timers = activeTimers.get(bookingId);
  
  if (timers) {
    console.log(`[Timers] Cancelling timers for booking ${bookingId}`);
    
    if (timers.followUp) {
      clearTimeout(timers.followUp);
    }
    if (timers.autoCancel) {
      clearTimeout(timers.autoCancel);
    }
    
    activeTimers.delete(bookingId);
  }
};

/**
 * Format phone number to E.164 format
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  const raw = String(phone).trim();
  const cleaned = raw.replace(/\D/g, '');
  if (!cleaned) return '';

  if (raw.startsWith('+')) {
    return `+${cleaned}`;
  }
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    return `+${cleaned}`;
  }
  return `+${cleaned}`;
};

module.exports = {
  startNotificationTimers,
  cancelTimers,
  FOLLOW_UP_DELAY,
  AUTO_CANCEL_DELAY
};
