const Booking = require('../models/Booking');
const Restaurant = require('../models/Restaurant');
const Table = require('../models/Table');
const Message = require('../models/Message');
const PartyDuration = require('../models/PartyDuration');
const { calculateWaitTime, getWaitTimeRange } = require('../utils/waitTimeCalculator');
const { sendSMS } = require('../utils/telnyxService');
const { formatPhoneNumber } = require('../utils/helpers');
const { getSmsTemplate } = require('../utils/smsTemplates');
const { startNotificationTimers, cancelTimers } = require('../utils/notificationTimers');

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
    console.error('Error logging message:', error);
  }
};

// Helper to broadcast wait time updates via SSE
const broadcastWaitTimeUpdate = async (req, restaurantId) => {
  try {
    const sseEmitter = req.app.get('sseEmitter');
    if (!sseEmitter) return;
    
    // Get all active tables capacities
    const tables = await Table.find({ 
      restaurantId: req.params.restaurantId, 
      isActive: true,
      status: { $nin: ['unavailable', 'reserved'] }
    }).distinct('capacity');
    
    if (tables.length === 0) return;
    
    // Calculate wait times for each party size
    const waitTimes = {};
    for (const size of tables.sort((a, b) => a - b)) {
      const result = await calculateWaitTime(restaurantId, size);
      waitTimes[size] = result.waitTime;
    }
    
    // Emit wait time update event
    sseEmitter.emit('waitTime', { restaurantId, type: 'wait_time_update', waitTimes });
  } catch (error) {
    console.error('Error broadcasting wait times:', error);
  }
};

// Create a new booking
const createBooking = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { customerName, customerPhone, partySize, skipSms, isCustomParty, language } = req.body;
    
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ message: 'Restaurant not found or inactive.' });
    }
    
    // Calculate wait time using smart calculator
    const waitResult = await calculateWaitTime(restaurantId, partySize);
    const waitTime = waitResult.waitTime;
    const estimatedSeatingTime = new Date(Date.now() + waitTime * 60 * 1000);
    
    // Create booking with language preference from kiosk
    const booking = new Booking({
      restaurantId,
      customerName,
      customerPhone,
      partySize,
      waitTime,
      estimatedSeatingTime,
      isCustomParty: isCustomParty || false,
      language: language || 'en'
    });
    
    await booking.save();
    
    // Only send SMS if skipSms is not true
    if (!skipSms) {
      // Format and send confirmation SMS in customer's language
      const formattedPhone = formatPhoneNumber(customerPhone);
      const message = getSmsTemplate('confirmation', language || 'en', {
        name: customerName,
        partySize: partySize.toString(),
        restaurant: restaurant.name,
        waitTime: waitTime.toString()
      });
      
      const smsResult = await sendSMS(formattedPhone, message);
      
      // Log the SMS
      await logMessage(
        restaurantId,
        booking._id,
        customerPhone,
        customerName,
        'outbound',
        'confirmation',
        message,
        smsResult?.messageId
      );
    }
    
    // Emit SSE event for new booking
    const sseEmitter = req.app.get('sseEmitter');
    if (sseEmitter) {
      sseEmitter.emit('booking', { restaurantId, type: 'new_booking', booking });
    }
    
    // Broadcast updated wait times
    broadcastWaitTimeUpdate(req, restaurantId);
    
    res.status(201).json({
      message: 'Booking created successfully',
      booking: {
        id: booking._id,
        customerName,
        customerPhone,
        partySize,
        waitTime,
        estimatedSeatingTime: booking.estimatedSeatingTime,
        isCustomParty: booking.isCustomParty || false
      }
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Server error creating booking.' });
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
    
    // Send notification SMS using template
    // Send notification SMS in customer's language
    const formattedPhone = formatPhoneNumber(booking.customerPhone);
    const message = getSmsTemplate('tableReady', booking.language || 'en', {
      name: booking.customerName,
      partySize: booking.partySize.toString(),
      restaurant: restaurant.name,
      gracePeriod: (restaurant.gracePeriodMinutes || 15).toString()
    });
    
    const smsResult = await sendSMS(formattedPhone, message);
    
    // Log the SMS
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
    
    // Emit SSE event
    const sseEmitter = req.app.get('sseEmitter');
    if (sseEmitter) {
      sseEmitter.emit('booking', { restaurantId: restaurant._id, type: 'status_change', booking });
    }
    
    // Start notification timers (7-min follow-up, 20-min auto-cancel)
    startNotificationTimers(booking._id.toString(), req.app);
    
    res.json({ message: 'Customer notified successfully' });
  } catch (error) {
    console.error('Notify customer error:', error);
    res.status(500).json({ message: 'Server error notifying customer.' });
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
    console.error('Mark seated error:', error);
    res.status(500).json({ message: 'Server error marking customer seated.' });
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
    
    // Update booking status
    booking.status = 'cancelled';
    await booking.save();
    
    // Send cancellation SMS
    // Send cancellation SMS in customer's language
    const formattedPhone = formatPhoneNumber(booking.customerPhone);
    const message = getSmsTemplate('cancelled', booking.language || 'en', {
      name: booking.customerName,
      restaurant: restaurant.name
    });
    
    const smsResult = await sendSMS(formattedPhone, message);
    
    // Log the SMS
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
    
    // Emit SSE event
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
    
    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ message: 'Server error cancelling booking.' });
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
    console.error('Complete booking error:', error);
    res.status(500).json({ message: 'Server error completing booking.' });
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
    const from = payload.from.phone_number;
    const body = payload.text;
    
    if (!from || !body) {
      return res.status(400).json({ message: 'Phone number and message body are required.' });
    }
    
    // Find the most recent notified booking from this phone
    const booking = await Booking.findOne({
      customerPhone: { $regex: from.replace('+', ''), $options: 'i' },
      status: 'notified'
    }).sort({ notificationSentAt: -1 }).populate('restaurantId');
    
    if (!booking) {
      return res.status(404).json({ message: 'No active booking found.' });
    }

    const restaurant = booking.restaurantId;
    
    // Log the incoming message
    await logMessage(
      restaurant._id,
      booking._id,
      from,
      booking.customerName,
      'inbound',
      'response',
      body
    );
    
    const response = body.trim().toUpperCase();
    const lang = booking.language || 'en';
    
    // Accept Y/YES (English) or O/OUI (French) as confirmation
    if (response === 'Y' || response === 'YES' || response === 'O' || response === 'OUI') {
      // Cancel the follow-up and auto-cancel timers
      cancelTimers(booking._id.toString());
      
      booking.status = 'confirmed';
      booking.confirmationReceivedAt = new Date();
      await booking.save();
      
      // CONFIRMATION SMS REMOVED AS REQUESTED
      // No outbound SMS sent here, but logic remains (timers cancelled, status updated)
      console.log(`[Booking] Confirmed booking ${booking._id} via SMS reply ${response}. No response sent.`);
      
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
      await sendSMS(from, message);
      await logMessage(restaurant._id, booking._id, from, booking.customerName, 'outbound', 'cancelled', message);
      
    } else {
      const message = getSmsTemplate('invalidResponse', lang);
      await sendSMS(from, message);
      await logMessage(restaurant._id, booking._id, from, booking.customerName, 'outbound', 'response', message);
      
      return res.json({ message: 'Invalid response received' });
    }
    
    // Emit SSE event
    const sseEmitter = req.app.get('sseEmitter');
    if (sseEmitter) {
      sseEmitter.emit('booking', { 
        restaurantId: restaurant._id, 
        type: 'status_change', 
        booking 
      });
      sseEmitter.emit('message', { 
        restaurantId: restaurant._id, 
        type: 'new_message',
        customerPhone: from 
      });
    }
    
    // Broadcast updated wait times (especially important if booking was cancelled)
    broadcastWaitTimeUpdate(req, restaurant._id);
    
    res.json({ message: 'Customer response processed successfully' });
  } catch (error) {
    console.error('Handle customer response error:', error);
    res.status(500).json({ message: 'Server error processing response.' });
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
    res.status(500).json({ message: 'Server error fetching booking status.' });
  }
};

// Get all bookings for a restaurant
const getBookings = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { status, date } = req.query;
    
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
    res.status(500).json({ message: 'Server error fetching bookings.' });
  }
};

// Get dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get counts
    const [totalWaiting, todaysSeated, totalBookings] = await Promise.all([
      Booking.countDocuments({ 
        restaurantId, 
        status: { $in: ['waiting', 'notified', 'confirmed'] } 
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
    res.status(500).json({ message: 'Server error fetching stats.' });
  }
};

// Get wait times for all party sizes (for kiosk display)
const getWaitTimes = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    
    // Get all unique table capacities for this restaurant
    const tables = await Table.find({ 
      restaurantId: req.params.restaurantId,
      isActive: true,
      status: { $nin: ['unavailable', 'reserved'] }
    }).distinct('capacity');
    
    if (tables.length === 0) {
      return res.json({ waitTimes: {} });
    }
    
    const partySizes = tables.sort((a, b) => a - b);
    
    // Calculate wait time for each party size
    const waitTimes = {};
    for (const size of partySizes) {
      const result = await calculateWaitTime(restaurantId, size);
      waitTimes[size] = result.waitTime;
    }
    
    res.json({ waitTimes });
  } catch (error) {
    console.error('Get wait times error:', error);
    res.status(500).json({ message: 'Server error fetching wait times.' });
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