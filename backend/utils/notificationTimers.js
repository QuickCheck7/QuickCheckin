/**
 * Notification Timers - Manages follow-up and auto-cancel timers for customer notifications
 * 
 * When a customer is notified their table is ready:
 * 1. Follow-up Timer (7 min): If no response, send reminder SMS
 * 2. Auto-cancel Timer (20 min total from notification): If staff has not seated guest, cancel booking even if replied 'Y'
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
const AUTO_CANCEL_DELAY = 20 * 60 * 1000; // 20 minutes (15 min arrival window + 5 min buffer)

// Background sweeper interval reference
let sweeperInterval = null;

// Helper to log SMS to Message model
const logMessage = async (restaurantId, bookingId, customerPhone, customerName, direction, messageType, content, telnyxMessageId = null) => {
  try {
    const message = new Message({
      restaurantId,
      bookingId,
      customerPhone,
      customerName,
      direction,
      messageType,
      content,
      telnyxMessageId,
      status: direction === 'outbound' ? 'sent' : 'received'
    });
    await message.save();
    return message;
  } catch (error) {
    console.error('[Timers] Error logging message:', error);
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

/**
 * Auto-cancel a booking that has exceeded the 20-minute arrival window.
 * Releases table, sends autoCancel SMS, logs message, and emits real-time SSE events.
 * Uses atomic findOneAndUpdate to prevent duplicate cancellations across timers and sweepers.
 * 
 * @param {string|object} bookingOrId - Booking ID or Booking document
 * @param {object} app - Express app instance (for SSE emitter)
 * @param {string} [customReason] - Optional custom cancellation reason
 * @returns {Promise<object|null>} The cancelled booking document or null
 */
const autoCancelBooking = async (bookingOrId, app, customReason = null) => {
  try {
    const bookingId = bookingOrId?._id ? bookingOrId._id.toString() : (bookingOrId ? bookingOrId.toString() : null);
    if (!bookingId) return null;

    // Clean up in-memory timers first
    cancelTimers(bookingId);

    // Determine default reason based on status prior to cancellation
    let priorStatus = bookingOrId?.status;
    if (!priorStatus) {
      const existing = await Booking.findById(bookingId).select('status').lean();
      priorStatus = existing?.status;
    }

    const defaultReason = priorStatus === 'confirmed'
      ? 'Guest did not arrive within 20 minutes of table ready notification'
      : 'No response - auto-cancelled after 20 minutes';
    const cancellationReason = customReason || defaultReason;

    // Atomic update: only update if status is 'notified' or 'confirmed'.
    // If guest was already seated ('seated') or cancelled, this returns null and prevents duplicate work!
    const booking = await Booking.findOneAndUpdate(
      {
        _id: bookingId,
        status: { $in: ['notified', 'confirmed'] }
      },
      {
        $set: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason
        }
      },
      { new: true }
    ).populate('restaurantId');

    if (!booking) {
      return null;
    }

    console.log(`[Timers] Auto-cancelled booking ${booking._id} (${booking.customerName}) - Status was: ${priorStatus || 'notified/confirmed'}`);

    const restaurant = booking.restaurantId;

    // Free up the assigned table
    if (booking.tableId) {
      const table = await Table.findById(booking.tableId);
      if (table) {
        table.status = 'available';
        table.currentBookingId = null;
        table.seatedAt = null;
        await table.save();

        // Emit SSE event for table status change
        const sseEmitter = app?.get?.('sseEmitter');
        if (sseEmitter) {
          sseEmitter.emit('table', {
            restaurantId: restaurant?._id || table.restaurantId,
            type: 'status_change',
            table
          });
        }
      }
    }

    // Send autoCancel SMS
    const formattedPhone = formatPhoneNumber(booking.customerPhone);
    const message = getSmsTemplate('autoCancel', booking.language || 'en', {
      name: booking.customerName,
      restaurant: restaurant?.name || 'Restaurant'
    });

    let smsResult = null;
    if (formattedPhone && message) {
      try {
        smsResult = await sendSMS(formattedPhone, message);
      } catch (smsErr) {
        console.error(`[Timers] Error sending auto-cancel SMS for booking ${booking._id}:`, smsErr);
      }

      // Log the cancellation message with messageType: 'tableReleased'
      await logMessage(
        restaurant?._id,
        booking._id,
        booking.customerPhone,
        booking.customerName,
        'outbound',
        'tableReleased',
        message,
        smsResult?.messageId
      );
    }

    // Emit SSE events (booking status, wait time, and message event for real-time conversation tab)
    const sseEmitter = app?.get?.('sseEmitter');
    if (sseEmitter) {
      sseEmitter.emit('booking', {
        restaurantId: restaurant?._id,
        type: 'status_change',
        booking
      });
      sseEmitter.emit('waitTime', {
        restaurantId: restaurant?._id,
        type: 'wait_time_update'
      });
      sseEmitter.emit('message', {
        restaurantId: restaurant?._id,
        type: 'new_message',
        customerPhone: booking.customerPhone
      });
    }

    console.log(`[Timers] Booking ${bookingId} auto-cancelled and table released successfully`);
    return booking;
  } catch (error) {
    console.error(`[Timers] Error auto-cancelling booking:`, error);
    return null;
  }
};

/**
 * Start notification timers for a booking
 * @param {string} bookingId - The booking ID to track
 * @param {object} app - Express app instance (for SSE emitter)
 */
const startNotificationTimers = (bookingId, app) => {
  const idStr = bookingId.toString();
  // Cancel any existing timers for this booking
  cancelTimers(idStr);
  
  console.log(`[Timers] Starting notification timers for booking ${idStr} (Follow-up: 7m, Auto-cancel: 20m)`);
  
  const timers = {
    followUp: null,
    autoCancel: null
  };
  
  // Follow-up timer (7 minutes)
  timers.followUp = setTimeout(async () => {
    try {
      const booking = await Booking.findById(idStr).populate('restaurantId');
      
      // Only send follow-up if still in 'notified' status (no response yet)
      if (booking && booking.status === 'notified') {
        console.log(`[Timers] Sending follow-up SMS for booking ${idStr}`);
        
        const restaurant = booking.restaurantId;
        const formattedPhone = formatPhoneNumber(booking.customerPhone);
        
        const message = getSmsTemplate('followUp', booking.language || 'en', {
          name: booking.customerName,
          restaurant: restaurant.name
        });
        
        let smsResult = null;
        try {
          smsResult = await sendSMS(formattedPhone, message);
        } catch (smsErr) {
          console.error(`[Timers] Error sending follow-up SMS for booking ${idStr}:`, smsErr);
        }
        
        // Log the follow-up message
        await logMessage(
          restaurant._id,
          booking._id,
          booking.customerPhone,
          booking.customerName,
          'outbound',
          'reminder',
          message,
          smsResult?.messageId
        );
        
        // Emit SSE event for new message
        const sseEmitter = app?.get?.('sseEmitter');
        if (sseEmitter) {
          sseEmitter.emit('message', {
            restaurantId: restaurant._id,
            type: 'new_message',
            customerPhone: booking.customerPhone
          });
        }
        
        console.log(`[Timers] Follow-up SMS sent for booking ${idStr}`);
      }
    } catch (error) {
      console.error(`[Timers] Error sending follow-up SMS for booking ${idStr}:`, error);
    }
  }, FOLLOW_UP_DELAY);
  
  // Auto-cancel timer (20 minutes total from notification)
  timers.autoCancel = setTimeout(async () => {
    try {
      await autoCancelBooking(idStr, app);
    } catch (error) {
      console.error(`[Timers] Error in auto-cancel timer for booking ${idStr}:`, error);
    }
  }, AUTO_CANCEL_DELAY);
  
  // Store the timers
  activeTimers.set(idStr, timers);
};

/**
 * Cancel only the follow-up reminder timer for a booking (e.g. when customer replies Y/YES)
 * Keeps the 20-minute auto-cancel timer running!
 * @param {string} bookingId - The booking ID
 */
const cancelFollowUpTimer = (bookingId) => {
  const idStr = bookingId ? bookingId.toString() : '';
  const timers = activeTimers.get(idStr);
  
  if (timers && timers.followUp) {
    console.log(`[Timers] Cancelling follow-up reminder timer for booking ${idStr}`);
    clearTimeout(timers.followUp);
    timers.followUp = null;
  }
};

/**
 * Ensure the auto-cancel timer is running for a confirmed booking
 * Useful when customer replies Y after a server restart or deployment
 * 
 * @param {object|string} booking - The booking document or ID
 * @param {object} app - Express app instance
 */
const ensureAutoCancelTimer = (booking, app) => {
  const idStr = booking?._id ? booking._id.toString() : (booking ? booking.toString() : '');
  if (!idStr) return;

  const existing = activeTimers.get(idStr);
  if (existing && existing.autoCancel) {
    console.log(`[Timers] Auto-cancel timer already active for booking ${idStr}`);
    return;
  }

  // Calculate elapsed time since notificationSentAt
  const sentAt = booking.notificationSentAt ? new Date(booking.notificationSentAt).getTime() : Date.now();
  const elapsed = Date.now() - sentAt;
  const remaining = Math.max(0, AUTO_CANCEL_DELAY - elapsed);

  console.log(`[Timers] Ensuring auto-cancel timer for booking ${idStr} (${Math.round(remaining / 1000)}s remaining)`);

  if (remaining <= 0) {
    // Arrival window already expired, cancel immediately
    autoCancelBooking(idStr, app).catch(err => {
      console.error(`[Timers] Immediate auto-cancel error for ${idStr}:`, err);
    });
    return;
  }

  const timerObj = existing || { followUp: null, autoCancel: null };
  timerObj.autoCancel = setTimeout(async () => {
    try {
      await autoCancelBooking(idStr, app);
    } catch (err) {
      console.error(`[Timers] Error in ensureAutoCancelTimer for ${idStr}:`, err);
    }
  }, remaining);

  activeTimers.set(idStr, timerObj);
};

/**
 * Cancel all active timers for a booking (e.g. when seated, manually cancelled, or replied N)
 * @param {string} bookingId - The booking ID
 */
const cancelTimers = (bookingId) => {
  const idStr = bookingId ? bookingId.toString() : '';
  const timers = activeTimers.get(idStr);
  
  if (timers) {
    console.log(`[Timers] Cancelling all timers for booking ${idStr}`);
    
    if (timers.followUp) {
      clearTimeout(timers.followUp);
    }
    if (timers.autoCancel) {
      clearTimeout(timers.autoCancel);
    }
    
    activeTimers.delete(idStr);
  }
};

/**
 * Sweep database for any bookings that have exceeded the 20-minute arrival window
 * Catches bookings that expired during server restarts or deployments
 * 
 * @param {object} app - Express app instance
 * @param {string} [restaurantId] - Optional restaurant filter
 */
const sweepOverdueBookings = async (app, restaurantId = null) => {
  try {
    const cutoff = new Date(Date.now() - AUTO_CANCEL_DELAY);
    const filter = {
      status: { $in: ['notified', 'confirmed'] },
      $or: [
        { notificationSentAt: { $lte: cutoff } },
        { notificationSentAt: { $exists: false }, updatedAt: { $lte: cutoff } },
        { notificationSentAt: null, updatedAt: { $lte: cutoff } }
      ]
    };
    if (restaurantId) {
      filter.restaurantId = restaurantId;
    }

    const overdueBookings = await Booking.find(filter).select('_id customerName status notificationSentAt');
    if (overdueBookings && overdueBookings.length > 0) {
      console.log(`[Sweeper] Found ${overdueBookings.length} overdue bookings to auto-cancel:`, 
        overdueBookings.map(b => `${b._id} (${b.customerName}, status=${b.status})`)
      );
      for (const b of overdueBookings) {
        await autoCancelBooking(b._id, app);
      }
    }
  } catch (error) {
    console.error('[Sweeper] Error sweeping overdue bookings:', error);
  }
};

/**
 * Initialize recurring background sweeper
 * Runs immediately on startup, then every 30 seconds
 * 
 * @param {object} app - Express app instance
 */
const initNotificationSweeper = (app) => {
  if (sweeperInterval) {
    clearInterval(sweeperInterval);
  }

  console.log('[Sweeper] Initializing overdue booking notification sweeper (30s interval)...');

  // Sweep immediately on startup
  sweepOverdueBookings(app).catch(err => {
    console.error('[Sweeper] Startup sweep error:', err);
  });

  // Run every 30 seconds
  sweeperInterval = setInterval(() => {
    sweepOverdueBookings(app).catch(err => {
      console.error('[Sweeper] Periodic sweep error:', err);
    });
  }, 30 * 1000);

  if (sweeperInterval.unref) {
    sweeperInterval.unref();
  }

  return sweeperInterval;
};

/**
 * Stop the background sweeper (used for graceful server shutdown)
 */
const stopNotificationSweeper = () => {
  if (sweeperInterval) {
    console.log('[Sweeper] Stopping overdue booking notification sweeper...');
    clearInterval(sweeperInterval);
    sweeperInterval = null;
  }
};

module.exports = {
  startNotificationTimers,
  cancelTimers,
  cancelFollowUpTimer,
  ensureAutoCancelTimer,
  autoCancelBooking,
  sweepOverdueBookings,
  initNotificationSweeper,
  stopNotificationSweeper,
  FOLLOW_UP_DELAY,
  AUTO_CANCEL_DELAY
};
