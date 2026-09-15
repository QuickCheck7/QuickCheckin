const Booking = require('../models/Booking');
const Restaurant = require('../models/Restaurant');
const Table = require('../models/Table');
const Message = require('../models/Message');
const PartyDuration = require('../models/PartyDuration');
const { calculateWaitTime, getWaitTimeRange } = require('../utils/waitTimeCalculator');
const { sendSMS } = require('../utils/telnyxService');
const { formatPhoneNumber } = require('../utils/helpers');
const { getSmsTemplate } = require('../utils/smsTemplates');
const {
  startNotificationTimers,
  cancelTimers,
  cancelFollowUpTimer,
  ensureAutoCancelTimer,
  sweepOverdueBookings
} = require('../utils/notificationTimers');

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
      status: direction === 'outbound' ? (telnyxMessageId ? 'sent' : 'failed') : 'received'
    });
    await message.save();
    return message;
  } catch (error) {
    console.error('Error logging message:', error);
  }
};

// Helper to broadcast wait time updates via SSE
const broadcastWaitTimeUpdate = async (req, restaurantId) => {
  try {
    const sseEmitter = req.app.get('sseEmitter');
    if (!sseEmitter) return;
    
    const targetRestaurantId = restaurantId || req.params?.restaurantId;
    if (!targetRestaurantId) return;

    const [restaurant, tables] = await Promise.all([
      Restaurant.findById(targetRestaurantId).select('allowedPartySizes'),
      Table.find({ 
        restaurantId: targetRestaurantId, 
        isActive: true,
        status: { $nin: ['unavailable', 'reserved'] }
      })
    ]);
    
    if (!tables || tables.length === 0) return;

    const maxCapacity = Math.max(...tables.map(t => t.capacity));
    const basePartySizes = (restaurant?.allowedPartySizes && restaurant.allowedPartySizes.length > 0)
      ? restaurant.allowedPartySizes
      : [1, 2, 3, 4, 5, 6, 7, 8];

    const validSizes = basePartySizes.filter(size => size <= maxCapacity);

    // Calculate wait times for each party size
    const waitTimes = {};
    for (const size of validSizes) {
      const result = await calculateWaitTime(targetRestaurantId, size);
      if (result && result.waitTime !== null && result.waitTime !== undefined) {
        waitTimes[size] = result.waitTime;
      }
    }
    
    // Emit wait time update event
    sseEmitter.emit('waitTime', { restaurantId: targetRestaurantId.toString(), type: 'wait_time_update', waitTimes });
  } catch (error) {
    console.error('Error broadcasting wait times:', error);
  }
};

// Create a new booking
const createBooking = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    let { customerName } = req.body;
    const { customerPhone, partySize, skipSms, isCustomParty, language } = req.body;
    
    // Format customer name to Title Case (e.g. HaRman SInGH -> Harman Singh)
    if (customerName) {
      customerName = customerName.trim().split(/\s+/).map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
    
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ message: 'Restaurant not found or inactive.' });
    }
    
    // Calculate wait time using smart calculator
    const waitResult = await calculateWaitTime(restaurantId, partySize);
    const waitTime = waitResult.waitTime !== null && waitResult.waitTime !== undefined ? waitResult.waitTime : 30;
    const estimatedSeatingTime = new Date(Date.now() + waitTime * 60 * 1000);
    
    const normalizedCustomerPhone = formatPhoneNumber(customerPhone);

    // Create booking with language preference from kiosk
    const booking = new Booking({
      restaurantId,
      customerName: (customerName || '').trim(),
      customerPhone: normalizedCustomerPhone || customerPhone.trim(),
      partySize,
      waitTime,
      estimatedSeatingTime,
      isCustomParty: isCustomParty || false,
      language: language || 'en'
    });
    
    await booking.save();
    
    // Emit SSE event for new booking immediately (0ms delay on restaurant dashboard)
    const sseEmitter = req.app.get('sseEmitter');
    if (sseEmitter) {
      sseEmitter.emit('booking', { restaurantId, type: 'new_booking', booking });
    }
    
    // Broadcast updated wait times immediately
    broadcastWaitTimeUpdate(req, restaurantId);
    
    // Return HTTP response immediately to customer / kiosk
    res.status(201).json({
      message: 'Booking created successfully',
      booking: {
        id: booking._id,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        partySize,
        waitTime,
        estimatedSeatingTime: booking.estimatedSeatingTime,
        isCustomParty: booking.isCustomParty || false
      }
    });

    // Send confirmation SMS asynchronously in background without delaying client or dashboard
    if (!skipSms) {
      (async () => {
        try {
          const formattedPhone = formatPhoneNumber(booking.customerPhone);
          const message = getSmsTemplate('confirmation', language || 'en', {
            name: booking.customerName,
            partySize: partySize.toString(),
            restaurant: restaurant.name,
            waitTime: waitTime.toString()
          });
          
          const smsResult = await sendSMS(formattedPhone, message);
          
          // Log the SMS with normalized customer phone
          await logMessage(
            restaurantId,
            booking._id,
            booking.customerPhone,
            booking.customerName,
            'outbound',
            'confirmation',
            message,
            smsResult?.messageId
          );

          // Emit message event for real-time conversation tab update
          if (sseEmitter) {
            sseEmitter.emit('message', {
              restaurantId,
              type: 'new_message',
              customerPhone: booking.customerPhone
            });
          }
        } catch (smsErr) {
          console.error(`[BookingController:createBooking] Background SMS error for booking ${booking._id}:`, smsErr);
        }
      })();
    }
  } catch (error) {
    console.error(`[BookingController:createBooking] Error for restaurant ${req.params?.restaurantId}:`, error);
    res.status(500).json({ message: 'Failed to create booking.', error: error.message || 'Database error occurred while creating booking.' });
  }
};

// Notify customer that table is ready
const notifyCustomer = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { tableId } = req.body;
    
    const booking = await Booking.findById(bookingId).populate('restaurantId');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    
    if (booking.status !== 'waiting') {
      return res.status(400).json({ message: 'Customer has already been notified.' });
    }

    const restaurant = booking.restaurantId;
    
    // Assign table if provided
    if (tableId) {
      const table = await Table.findById(tableId);
      if (table && table.status === 'available') {
        table.status = 'reserved';
        table.currentBookingId = booking._id;
        await table.save();
        booking.tableId = tableId;
      }
    }
    
    // Update booking status
    booking.status = 'notified';
    booking.notificationSentAt = new Date();
    await booking.save();

    // Emit SSE event immediately so dashboard updates in real-time
    const sseEmitter = req.app.get('sseEmitter');
    if (sseEmitter) {
      sseEmitter.emit('booking', { restaurantId: restaurant._id, type: 'status_change', booking });
    }
    
    // Start notification timers (7-min follow-up, 20-min auto-cancel)
    startNotificationTimers(booking._id.toString(), req.app);
    
    // Return response immediately so staff UI does not hang
    res.json({ message: 'Customer notified successfully' });

    // Send notification SMS in background
    (async () => {
      try {
        const formattedPhone = formatPhoneNumber(booking.customerPhone);
        const message = getSmsTemplate('tableReady', booking.language || 'en', {
          name: booking.customerName,
          partySize: booking.partySize.toString(),
          restaurant: restaurant.name,
          gracePeriod: (restaurant.gracePeriodMinutes || 15).toString()
        });
        
        const smsResult = await sendSMS(formattedPhone, message);
        
        await logMessage(
          restaurant._id,
          booking._id,
          booking.customerPhone,
          booking.customerName,
          'outbound',
          'tableReady',
          message,
          smsResult?.messageId
        );

        if (sseEmitter) {
          sseEmitter.emit('message', {
            restaurantId: restaurant._id,
            type: 'new_message',
            customerPhone: booking.customerPhone
          });
        }
      } catch (smsErr) {
        console.error(`[BookingController:notifyCustomer] Background SMS error for booking ${booking._id}:`, smsErr);
      }
    })();
  } catch (error) {
    console.error(`[BookingController:notifyCustomer] Error for booking ${req.params?.bookingId}:`, error);
    res.status(500).json({ message: 'Failed to notify customer.', error: error.message || 'Error occurred while notifying customer.' });
  }
};

// Mark customer as seated
const markSeated = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { tableId } = req.body;
    
    // Table is now required
    if (!tableId) {
      return res.status(400).json({ message: 'Table selection is required to seat a customer.' });
    }
    
    const booking = await Booking.findById(bookingId).populate('restaurantId');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    
    if (!['notified', 'confirmed', 'waiting'].includes(booking.status)) {
      return res.status(400).json({ message: 'Invalid booking status for seating.' });
    }
    
    // Validate table availability
    const table = await Table.findById(tableId);
    if (!table) {
      return res.status(404).json({ message: 'Table not found.' });
    }
    
    if (table.status !== 'available') {
      const statusMessage = table.status === 'occupied' 
        ? 'This table is currently occupied. Please mark it for cleaning first when the customer leaves.'
        : table.status === 'cleaning'
        ? 'This table is being cleaned. Please wait until it becomes available.'
        : 'This table is reserved for another customer.';
      return res.status(400).json({ message: statusMessage });
    }
    
    // Check capacity
    if (table.capacity < booking.partySize) {
      return res.status(400).json({ 
        message: `Table ${table.tableNumber} only seats ${table.capacity}, but party size is ${booking.partySize}.` 
      });
    }
    
    // Get party duration for expected end time
    let partyDuration = await PartyDuration.findOne({ partySize: booking.partySize });
    if (!partyDuration) {
      partyDuration = { avgDuration: 90 };
    }
    
    const now = new Date();
    const expectedEndTime = new Date(now.getTime() + partyDuration.avgDuration * 60 * 1000);
    
    // Cancel any pending notification timers (follow-up / auto-cancel)
    cancelTimers(booking._id.toString());
    
    // Update table status to occupied
    table.status = 'occupied';
    table.currentBookingId = booking._id;
    table.seatedAt = now;
    await table.save();
    
    // Update booking
    booking.tableId = tableId;
    booking.status = 'seated';
    booking.seatedAt = now;
    booking.expectedEndTime = expectedEndTime;
    await booking.save();
    
    // Emit SSE events for both booking and table updates
    const sseEmitter = req.app.get('sseEmitter');
    if (sseEmitter) {
      // Notify about booking status change
      sseEmitter.emit('booking', { 
        restaurantId: booking.restaurantId._id, 
        type: 'status_change', 
        booking 
      });
      // Notify about table status change
      sseEmitter.emit('table', { 
        restaurantId: table.restaurantId, 
        type: 'status_change', 
        table 
      });
    }
    
    // Broadcast updated wait times
    broadcastWaitTimeUpdate(req, booking.restaurantId._id);
    
    res.json({ 
      message: `Customer seated at Table ${table.tableNumber}`,
      expectedEndTime,
      table: {
        _id: table._id,
        tableNumber: table.tableNumber,
        status: table.status
      }
    });
  } catch (error) {
    console.error(`[BookingController:markSeated] Error for booking ${req.params?.bookingId}:`, error);
    res.status(500).json({ message: 'Failed to mark customer seated.', error: error.message || 'Database error occurred while updating booking.' });
  }
};

// Cancel booking
const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const booking = await Booking.findById(bookingId).populate('restaurantId');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    
    const restaurant = booking.restaurantId;
    
    // Free up the table if assigned
    if (booking.tableId) {
      const table = await Table.findById(booking.tableId);
      if (table) {
        table.status = 'available';
        table.currentBookingId = null;
        table.seatedAt = null;
        await table.save();
      }
    }
    
    // Cancel any pending notification timers
    cancelTimers(booking._id.toString());

    // Update booking status
    booking.status = 'cancelled';
    await booking.save();
    
    // Emit SSE event immediately
    const sseEmitter = req.app.get('sseEmitter');
    if (sseEmitter) {
      sseEmitter.emit('booking', { 
        restaurantId: restaurant._id, 
        type: 'status_change', 
        booking 
      });
    }
    
    // Broadcast updated wait times
    broadcastWaitTimeUpdate(req, restaurant._id);
    
    // Return response immediately
    res.json({ message: 'Booking cancelled successfully' });

    // Send cancellation SMS in background
    (async () => {
      try {
        const formattedPhone = formatPhoneNumber(booking.customerPhone);
        const message = getSmsTemplate('cancelled', booking.language || 'en', {
          name: booking.customerName,
          restaurant: restaurant.name
        });
        
        const smsResult = await sendSMS(formattedPhone, message);
        
        await logMessage(
          restaurant._id,
          booking._id,
          booking.customerPhone,
          booking.customerName,
          'outbound',
          'cancelled',
          message,
          smsResult?.messageId
        );

        if (sseEmitter) {
          sseEmitter.emit('message', { 
            restaurantId: restaurant._id, 
            type: 'new_message', 
            customerPhone: booking.customerPhone 
          });
        }
      } catch (smsErr) {
        console.error(`[BookingController:cancelBooking] Background SMS error for booking ${booking._id}:`, smsErr);
      }
    })();
  } catch (error) {
    console.error(`[BookingController:cancelBooking] Error for booking ${req.params?.bookingId}:`, error);
    res.status(500).json({ message: 'Failed to cancel booking.', error: error.message || 'Database error occurred while cancelling booking.' });
  }
};

// Complete booking (customer finished dining)
const completeBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    
    if (booking.status !== 'seated') {
      return res.status(400).json({ message: 'Booking must be seated to complete.' });
    }
    
    // Free up the table
    if (booking.tableId) {
      const table = await Table.findById(booking.tableId);
      if (table) {
        table.status = 'cleaning';
        table.currentBookingId = null;
        table.seatedAt = null;
        await table.save();
        
        // After 5 minutes, mark as available (simulate cleaning)
        setTimeout(async () => {
          const t = await Table.findById(booking.tableId);
          if (t && t.status === 'cleaning') {
            t.status = 'available';
            await t.save();
          }
        }, 5 * 60 * 1000);
      }
    }
    
    // Update booking
    booking.status = 'completed';
    booking.completedAt = new Date();
    await booking.save();
    
    // Emit SSE event
    const sseEmitter = req.app.get('sseEmitter');
    if (sseEmitter) {
      sseEmitter.emit('booking', { 
        restaurantId: booking.restaurantId, 
        type: 'status_change', 
        booking 
      });
    }
    
    // Broadcast updated wait times
    broadcastWaitTimeUpdate(req, booking.restaurantId);
    
    res.json({ message: 'Booking completed successfully' });
  } catch (error) {
    console.error(`[BookingController:completeBooking] Error for booking ${req.params?.bookingId}:`, error);
    res.status(500).json({ message: 'Failed to complete booking.', error: error.message || 'Database error occurred while completing booking.' });
  }
};

// Handle customer response (from Telnyx webhook)
const handleCustomerResponse = async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data || !data.payload) {
      return res.status(400).json({ message: 'Invalid webhook payload.' });
    }

    const { payload } = data;
    const eventType = data.event_type;

    // 1. If this is a delivery status event (outbound delivery receipt), handle status update and EXIT
    if (eventType && eventType !== 'message.received') {
      const messageId = payload.id;
      if (messageId) {
        const statusMap = {
          'message.delivered': 'delivered',
          'message.sent': 'sent',
          'message.finalized': 'sent',
          'message.failed': 'failed',
          'message.delivery_failed': 'failed',
          'message.undelivered': 'failed'
        };
        const newStatus = statusMap[eventType];
        if (newStatus) {
          await Message.updateMany({ telnyxMessageId: messageId }, { status: newStatus });
          console.log(`[Telnyx Webhook] Updated status of message ${messageId} to ${newStatus}`);
        }
      }
      return res.status(200).json({ message: `Handled status event: ${eventType}` });
    }

    // Also ignore if direction is explicitly outbound
    if (payload.direction === 'outbound') {
      return res.status(200).json({ message: 'Ignored outbound event.' });
    }

    const rawFrom = payload.from?.phone_number || payload.from;
    const body = payload.text || (payload.media?.length ? '[Image attachment]' : '');
    
    if (!rawFrom) {
      return res.status(200).json({ message: 'Ignored webhook with no phone number.' });
    }

    if (!body) {
      return res.status(200).json({ message: 'Ignored empty message body.' });
    }

    // 2. Reject non-phone senders (e.g. alphanumeric "QuickCheck", shortcodes)
    const fromDigits = String(rawFrom || '').replace(/\D/g, '');
    if (fromDigits.length < 7) {
      console.warn(`[Telnyx Webhook] Ignoring incoming webhook from non-phone sender: "${rawFrom}"`);
      return res.status(200).json({ message: 'Ignored non-phone sender.' });
    }

    // 3. Ignore loopback messages originating from our own Telnyx number
    const myNumberDigits = (process.env.TELNYX_PHONE_NUMBER || '').replace(/\D/g, '');
    if (myNumberDigits && fromDigits === myNumberDigits) {
      console.warn('[Telnyx Webhook] Ignoring loopback message from own phone number.');
      return res.status(200).json({ message: 'Ignored loopback message.' });
    }

    // 4. Flexible lookup matching digits across any spacing or dash variations
    const searchDigits = fromDigits.length >= 10 ? fromDigits.slice(-10) : fromDigits;
    const digitPattern = searchDigits.split('').join('[\\s\\-\\(\\)\\.]*');
    const phoneRegex = new RegExp(`[\\s\\-\\(\\)\\.]*${digitPattern}[\\s\\-\\(\\)\\.]*$`, 'i');

    // Prioritize most recent notified booking, then active (waiting/confirmed), then any booking
    let booking = await Booking.findOne({
      customerPhone: phoneRegex,
      status: 'notified'
    }).sort({ notificationSentAt: -1 }).populate('restaurantId');
    
    if (!booking) {
      booking = await Booking.findOne({
        customerPhone: phoneRegex,
        status: { $in: ['waiting', 'confirmed'] }
      }).sort({ createdAt: -1 }).populate('restaurantId');
    }

    if (!booking) {
      booking = await Booking.findOne({
        customerPhone: phoneRegex
      }).sort({ createdAt: -1 }).populate('restaurantId');
    }

    if (!booking) {
      console.warn(`[Telnyx Webhook] No active booking found for incoming phone: ${rawFrom}`);
      return res.status(200).json({ message: 'No active booking found.' });
    }

    const restaurant = booking.restaurantId;
    // Canonical customer phone (always normalized, never sender name)
    const customerPhone = booking.customerPhone || formatPhoneNumber(rawFrom);
    
    // Log the incoming message
    await logMessage(
      restaurant._id,
      booking._id,
      customerPhone,
      booking.customerName,
      'inbound',
      'response',
      body,
      payload.id
    );
    
    const response = body.trim().toUpperCase();
    const lang = booking.language || 'en';
    const sseEmitter = req.app.get('sseEmitter');
    
    // Accept Y/YES (English) or O/OUI (French) as confirmation
    if (response === 'Y' || response === 'YES' || response === 'O' || response === 'OUI') {
      // Cancel ONLY the 7-minute reminder timer since customer already responded.
      // Keep auto-cancel timer running! Guest must arrive within 20 minutes of table ready notification.
      cancelFollowUpTimer(booking._id.toString());
      ensureAutoCancelTimer(booking, req.app);
      
      booking.status = 'confirmed';
      booking.confirmationReceivedAt = new Date();
      await booking.save();
      
      console.log(`[Booking] Confirmed booking ${booking._id} via SMS reply ${response}. Auto-cancel timer remains active.`);

      if (sseEmitter) {
        sseEmitter.emit('booking', { 
          restaurantId: restaurant._id, 
          type: 'status_change', 
          booking 
        });
        sseEmitter.emit('message', { 
          restaurantId: restaurant._id, 
          type: 'new_message', 
          customerPhone 
        });
      }
      
    } else if (response === 'N' || response === 'NO' || response === 'NON') {
      // Cancel the follow-up and auto-cancel timers
      cancelTimers(booking._id.toString());
      
      // Free up table
      if (booking.tableId) {
        const table = await Table.findById(booking.tableId);
        if (table) {
          table.status = 'available';
          table.currentBookingId = null;
          table.seatedAt = null;
          await table.save();
        }
      }
      
      booking.status = 'cancelled';
      await booking.save();
      
      const message = getSmsTemplate('cancelledByCustomer', lang, {
        name: booking.customerName,
        restaurant: restaurant.name
      });
      
      const smsResult = await sendSMS(customerPhone, message);
      await logMessage(restaurant._id, booking._id, customerPhone, booking.customerName, 'outbound', 'cancelled', message, smsResult?.messageId);
      
      if (sseEmitter) {
        sseEmitter.emit('booking', { 
          restaurantId: restaurant._id, 
          type: 'status_change', 
          booking 
        });
        sseEmitter.emit('message', { 
          restaurantId: restaurant._id, 
          type: 'new_message', 
          customerPhone 
        });
      }
      
    } else {
      const message = getSmsTemplate('invalidResponse', lang);
      const smsResult = await sendSMS(customerPhone, message);
      await logMessage(restaurant._id, booking._id, customerPhone, booking.customerName, 'outbound', 'response', message, smsResult?.messageId);
      
      if (sseEmitter) {
        sseEmitter.emit('message', { 
          restaurantId: restaurant._id, 
          type: 'new_message', 
          customerPhone 
        });
      }
      
      return res.json({ message: 'Invalid response received and handled' });
    }
    
    // Broadcast updated wait times
    broadcastWaitTimeUpdate(req, restaurant._id);
    
    res.json({ message: 'Customer response processed successfully' });
  } catch (error) {
    console.error('Handle customer response error:', error);
    res.status(500).json({ message: 'Server error processing response.', error: error.message || 'Unknown error' });
  }
};

// Get booking status
const getBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const booking = await Booking.findById(bookingId).populate('restaurantId', 'name logo');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    
    res.json({
      booking: {
        id: booking._id,
        customerName: booking.customerName,
        partySize: booking.partySize,
        status: booking.status,
        waitTime: booking.waitTime,
        estimatedSeatingTime: booking.estimatedSeatingTime,
        checkInTime: booking.checkInTime,
        seatedAt: booking.seatedAt,
        expectedEndTime: booking.expectedEndTime,
        restaurant: booking.restaurantId
      }
    });
  } catch (error) {
    console.error('Get booking status error:', error);
    res.status(500).json({ message: 'Server error fetching booking status.', error: error.message || 'Unknown error' });
  }
};

// Get all bookings for a restaurant
const getBookings = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { status, date } = req.query;
    
    // Sweep overdue bookings before querying so active waitlist is always clean
    await sweepOverdueBookings(req.app, restaurantId);

    const query = { restaurantId };
    
    // Filter by status
    if (status) {
      const statuses = status.split(',');
      query.status = { $in: statuses };
    }
    
    // Filter by date (today by default)
    const startOfDay = date ? new Date(date) : new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);
    
    query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    
    const bookings = await Booking.find(query)
      .populate('tableId', 'tableNumber capacity')
      .sort({ createdAt: -1 });
    
    res.json({ bookings });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Server error fetching bookings.', error: error.message || 'Unknown error' });
  }
};

// Get dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    // Sweep overdue bookings before calculating counts
    await sweepOverdueBookings(req.app, restaurantId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get counts
    const [totalWaiting, todaysSeated, totalBookings] = await Promise.all([
      Booking.countDocuments({ 
        restaurantId, 
        status: { $in: ['waiting', 'notified', 'confirmed'] },
        createdAt: { $gte: today, $lte: endOfDay }
      }),
      Booking.countDocuments({ 
        restaurantId, 
        status: { $in: ['seated', 'completed'] },
        createdAt: { $gte: today, $lte: endOfDay }
      }),
      Booking.countDocuments({ 
        restaurantId,
        createdAt: { $gte: today, $lte: endOfDay }
      })
    ]);
    
    // Get available tables
    const availableTables = await Table.countDocuments({
      restaurantId,
      status: 'available',
      isActive: true
    });
    
    // Calculate average wait time from recent bookings
    const recentBookings = await Booking.find({
      restaurantId,
      status: { $in: ['seated', 'completed'] },
      createdAt: { $gte: today }
    }).limit(20);
    
    let avgWaitTime = 0;
    if (recentBookings.length > 0) {
      const totalWait = recentBookings.reduce((sum, b) => sum + (b.waitTime || 0), 0);
      avgWaitTime = Math.round(totalWait / recentBookings.length);
    }
    
    res.json({
      totalWaiting,
      avgWaitTime,
      availableTables,
      todaysSeated,
      totalBookings
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error fetching stats.', error: error.message || 'Unknown error' });
  }
};

// Get wait times for all party sizes (for kiosk display)
const getWaitTimes = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    const [restaurant, tables] = await Promise.all([
      Restaurant.findById(restaurantId).select('allowedPartySizes'),
      Table.find({ 
        restaurantId,
        isActive: true,
        status: { $nin: ['unavailable', 'reserved'] }
      })
    ]);
    
    if (!tables || tables.length === 0) {
      return res.json({ waitTimes: {} });
    }
    
    const maxCapacity = Math.max(...tables.map(t => t.capacity));
    const basePartySizes = (restaurant?.allowedPartySizes && restaurant.allowedPartySizes.length > 0)
      ? restaurant.allowedPartySizes
      : [1, 2, 3, 4, 5, 6, 7, 8];

    const validSizes = basePartySizes.filter(size => size <= maxCapacity);

    // Calculate wait time for each party size
    const waitTimes = {};
    for (const size of validSizes) {
      const result = await calculateWaitTime(restaurantId, size);
      if (result && result.waitTime !== null && result.waitTime !== undefined) {
        waitTimes[size] = result.waitTime;
      }
    }
    
    res.json({ waitTimes });
  } catch (error) {
    console.error('Get wait times error:', error);
    res.status(500).json({ message: 'Server error fetching wait times.', error: error.message || 'Unknown error' });
  }
};

module.exports = {
  createBooking,
  notifyCustomer,
  markSeated,
  cancelBooking,
  completeBooking,
  handleCustomerResponse,
  getBookingStatus,
  getBookings,
  getDashboardStats,
  getWaitTimes
};