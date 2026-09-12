const Restaurant = require('../models/Restaurant');
const Table = require('../models/Table');
const Booking = require('../models/Booking');
const Session = require('../models/Session');
const Message = require('../models/Message');
const jwt = require('jsonwebtoken');
const generateOTP = require('../utils/otpGenerator');
const { sendSMS, formatPhoneNumber } = require('../utils/telnyxService');
const { calculateWaitTime } = require('../utils/waitTimeCalculator');

// Restaurant Admin Login - Request OTP
const requestLoginOTP = async (req, res) => {
  try {
    const { phone, role } = req.body;

    if (!phone || !role) {
      return res.status(400).json({ message: 'Phone number and role are required.' });
    }

    if (!['admin', 'guest'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be admin or guest.' });
    }

    // Find restaurant by phone
    const restaurant = await Restaurant.findOne({ phone });
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found.' });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in session
    const session = new Session({
      restaurantId: restaurant._id,
      phone,
      role,
      otp,
      expiresAt
    });
    await session.save();

    // Send OTP via SMS
    const formattedPhone = formatPhoneNumber(phone);
    const message = `Your QuickCheck login OTP is: ${otp}. Valid for 10 minutes.`;
    
    const smsSent = await sendSMS(formattedPhone, message);

    if (!smsSent.success) {
      return res.status(500).json({ message: 'Failed to send OTP. Please try again.', error: error.message || 'Unknown error' });
    }

    res.json({ message: 'OTP sent successfully to your phone number' });
  } catch (error) {
    console.error('Request login OTP error:', error);
    res.status(500).json({ message: 'Server error sending OTP.', error: error.message || 'Unknown error' });
  }
};

// Restaurant Admin Login - Verify OTP
const verifyLoginOTP = async (req, res) => {
  try {
    const { phone, role, otp } = req.body;

    if (!phone || !role || !otp) {
      return res.status(400).json({ message: 'Phone number, role, and OTP are required.' });
    }

    if (!['admin', 'guest'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be admin or guest.' });
    }

    // Find restaurant by phone
    const restaurant = await Restaurant.findOne({ phone });
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found.' });
    }

    // Verify OTP
    const session = await Session.findOne({ restaurantId: restaurant._id, phone, role, otp });
    if (!session) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    if (session.expiresAt < new Date()) {
      await Session.findByIdAndDelete(session._id);
      return res.status(400).json({ message: 'OTP has expired.' });
    }

    // Delete used session
    await Session.findByIdAndDelete(session._id);

    // Generate JWT token
    const token = jwt.sign(
      { 
        restaurantId: restaurant._id,
        phone,
        role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    res.json({
      message: 'Login successful',
      token,
      sessionToken: token,
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
    res.status(500).json({ message: 'Server error verifying OTP.', error: error.message || 'Unknown error' });
  }
};

// Get restaurant settings
const getSettings = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found.' });
    }

    // Get tables
    const tables = await Table.find({ restaurantId, isActive: true });
    
    // Sort tables naturally (e.g. T1, T2... T10)
    tables.sort((a, b) => 
      (a.tableNumber || '').localeCompare(b.tableNumber || '', undefined, { numeric: true, sensitivity: 'base' })
    );

    res.json({
      settings: {
        // Read-only fields
        name: restaurant.name,
        phone: restaurant.phone,
        address: restaurant.address,
        city: restaurant.city,
        logo: restaurant.logo,
        subscriptionPlan: restaurant.subscriptionPlan,
        seatCapacity: restaurant.seatCapacity,
        // Editable fields
        gracePeriodMinutes: restaurant.gracePeriodMinutes,
        reminderDelayMinutes: restaurant.reminderDelayMinutes,
        allowedPartySizes: restaurant.allowedPartySizes,
        smsTemplates: restaurant.smsTemplates
      },
      tables
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error fetching settings.', error: error.message || 'Unknown error' });
  }
};

// Update restaurant settings
const updateSettings = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { gracePeriodMinutes, reminderDelayMinutes, allowedPartySizes, smsTemplates } = req.body;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found.' });
    }

    // Only update allowed fields (not name, phone, address)
    if (gracePeriodMinutes !== undefined) {
      restaurant.gracePeriodMinutes = Math.min(60, Math.max(5, gracePeriodMinutes));
    }
    if (reminderDelayMinutes !== undefined) {
      restaurant.reminderDelayMinutes = Math.min(30, Math.max(3, reminderDelayMinutes));
    }
    if (allowedPartySizes !== undefined) {
      restaurant.allowedPartySizes = allowedPartySizes;
    }
    if (smsTemplates !== undefined) {
      restaurant.smsTemplates = { ...restaurant.smsTemplates, ...smsTemplates };
    }

    await restaurant.save();

    res.json({ 
      message: 'Settings updated successfully',
      settings: {
        gracePeriodMinutes: restaurant.gracePeriodMinutes,
        reminderDelayMinutes: restaurant.reminderDelayMinutes,
        allowedPartySizes: restaurant.allowedPartySizes,
        smsTemplates: restaurant.smsTemplates
      }
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error updating settings.', error: error.message || 'Unknown error' });
  }
};

// Update tables configuration
const updateTables = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { tables } = req.body;

    if (!Array.isArray(tables)) {
      return res.status(400).json({ message: 'Tables array is required.' });
    }

    // Check seat capacity limit for small plan
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found.' });
    }

    const totalSeats = tables.reduce((sum, t) => sum + (parseInt(t.capacity) || 0), 0);

    // Enforce 50 seat limit for small plan
    if (restaurant.subscriptionPlan === 'small' && totalSeats > 50) {
      return res.status(403).json({
        message: `Your Small plan allows up to 50 seats. You're trying to configure ${totalSeats} seats. Please upgrade to the Large plan for unlimited seating.`,
        code: 'SEAT_LIMIT_EXCEEDED',
        currentSeats: totalSeats,
        maxSeats: 50
      });
    }

    // Get existing table IDs to track deletions
    const existingTables = await Table.find({ restaurantId });
    const existingIds = existingTables.map(t => t._id.toString());
    const newIds = tables.filter(t => t.id).map(t => t.id);

    // Delete removed tables
    const toDelete = existingIds.filter(id => !newIds.includes(id));
    if (toDelete.length > 0) {
      await Table.deleteMany({ _id: { $in: toDelete } });
    }

    // Update or create tables
    for (const tableData of tables) {
      if (tableData.id) {
        // Update existing
        await Table.findByIdAndUpdate(tableData.id, {
          tableNumber: tableData.tableNumber,
          capacity: tableData.capacity,
          isActive: tableData.isActive !== false
        });
      } else {
        // Create new
        await Table.create({
          restaurantId,
          tableNumber: tableData.tableNumber,
          capacity: tableData.capacity,
          status: 'available',
          isActive: true
        });
      }
    }

    const updatedTables = await Table.find({ restaurantId, isActive: true });
    
    // Sort tables naturally
    updatedTables.sort((a, b) => 
      (a.tableNumber || '').localeCompare(b.tableNumber || '', undefined, { numeric: true, sensitivity: 'base' })
    );
    res.json({ 
      message: 'Tables updated successfully',
      tables: updatedTables
    });
  } catch (error) {
    console.error('Update tables error:', error);
    res.status(500).json({ message: 'Server error updating tables.', error: error.message || 'Unknown error' });
  }
};

// Get restaurant dashboard data (legacy)
const getDashboardData = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ message: 'Restaurant not found or inactive.' });
    }

    // Get current bookings
    const currentBookings = await Booking.find({ 
      restaurantId, 
      status: { $in: ['waiting', 'notified', 'confirmed'] } 
    }).sort({ createdAt: 1 });

    // Get table configuration
    const tables = await Table.find({ restaurantId, isActive: true });

    // Calculate available tables
    const availableTables = tables.filter(t => t.status === 'available').length;
    const totalWaiting = currentBookings.length;
    const avgWaitTime = restaurant.avgWaitTime || 15;

    res.json({
      restaurant: {
        name: restaurant.name,
        logo: restaurant.logo
      },
      dashboard: {
        totalWaiting,
        availableTables,
        avgWaitTime
      },
      bookings: currentBookings,
      tables
    });
  } catch (error) {
    console.error('Get dashboard data error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard data.', error: error.message || 'Unknown error' });
  }
};

// Get messages for a restaurant
const getMessages = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { customerPhone, limit = 50 } = req.query;

    const query = { restaurantId };

    // When no search term is provided, apply the business-day window.
    // A business day runs 6:00 AM → next 6:00 AM in Canada/Eastern time (handles DST automatically).
    if (!customerPhone) {
      const nowUtc = new Date();

      // Step 1 – get today's date components in Eastern Time
      const etParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Toronto',
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
        hour12: false
      }).formatToParts(nowUtc);
      const etYear  = parseInt(etParts.find(p => p.type === 'year').value, 10);
      const etMonth = parseInt(etParts.find(p => p.type === 'month').value, 10) - 1;
      const etDay   = parseInt(etParts.find(p => p.type === 'day').value, 10);
      const etHour  = parseInt(etParts.find(p => p.type === 'hour').value, 10);

      // Step 2 – derive the ET→UTC offset using a safe mid-day reference point
      const etDateStr = `${etYear}-${String(etMonth + 1).padStart(2, '0')}-${String(etDay).padStart(2, '0')}`;
      const midDayUtc = new Date(`${etDateStr}T12:00:00Z`); // noon UTC is always safely within ET day
      const midDayEtStr = midDayUtc.toLocaleString('en-US', { timeZone: 'America/Toronto', hour12: false });
      const [mdyPart, timePart] = midDayEtStr.split(', ');
      const [mo, dy, yr] = mdyPart.split('/');
      const [hh, mm, ss] = timePart.split(':');
      const midDayEtAsUtc = new Date(Date.UTC(+yr, +mo - 1, +dy, +hh, +mm, +ss));
      const etOffsetMs = midDayUtc.getTime() - midDayEtAsUtc.getTime(); // e.g. +18000000 (UTC-5) or +14400000 (UTC-4)

      // Step 3 – compute 6 AM ET today in UTC; if we haven't reached it yet, use yesterday's 6 AM
      const sixAmTodayUtc = new Date(Date.UTC(etYear, etMonth, etDay, 6, 0, 0) + etOffsetMs);
      const businessDayStartUtc = nowUtc < sixAmTodayUtc
        ? new Date(sixAmTodayUtc.getTime() - 24 * 60 * 60 * 1000) // yesterday's 6 AM ET
        : sixAmTodayUtc;                                           // today's 6 AM ET
      const businessDayEndUtc = new Date(businessDayStartUtc.getTime() + 24 * 60 * 60 * 1000);

      query.createdAt = { $gte: businessDayStartUtc, $lt: businessDayEndUtc };
    } else {
      query.customerPhone = { $regex: customerPhone, $options: 'i' };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Group by customer phone for conversation view
    const conversations = {};
    messages.forEach(msg => {
      const phone = msg.customerPhone;
      if (!conversations[phone]) {
        conversations[phone] = {
          customerPhone: phone,
          customerName: msg.customerName,
          messages: [],
          lastMessage: null
        };
      }
      conversations[phone].messages.push(msg);
    });

    // Sort conversations by last message time
    const sortedConversations = Object.values(conversations)
      .map(conv => ({
        ...conv,
        lastMessage: conv.messages[0],
        messages: conv.messages.reverse()
      }))
      .sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));

    res.json({ conversations: sortedConversations });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error fetching messages.', error: error.message || 'Unknown error' });
  }
};

// Helper to broadcast wait time updates via SSE
const broadcastWaitTimeUpdate = async (req, restaurantId) => {
  try {
    const sseEmitter = req.app.get('sseEmitter');
    if (!sseEmitter) return;
    
    // Get all table capacities
    const tables = await Table.find({ 
      restaurantId, 
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

// Update table status (for cleaning/available flow)
const updateTableStatus = async (req, res) => {
  try {
    const { tableId } = req.params;
    const { status } = req.body;

    if (!['available', 'occupied', 'reserved', 'cleaning', 'unavailable'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const table = await Table.findById(tableId);
    if (!table) {
      return res.status(404).json({ message: 'Table not found.' });
    }

    table.status = status;
    
    // Clear booking reference if marking available, cleaning, unavailable, or reserved
    if (['available', 'cleaning', 'unavailable', 'reserved'].includes(status)) {
      table.currentBookingId = null;
      table.seatedAt = null;
    } else if (status === 'occupied') {
      // Ensure seatedAt is fresh if manually marking occupied
      table.seatedAt = new Date();
    }

    await table.save();

    // Emit SSE event
    const sseEmitter = req.app.get('sseEmitter');
    if (sseEmitter) {
      sseEmitter.emit('table', { 
        restaurantId: table.restaurantId, 
        type: 'status_change', 
        table 
      });
    }

    // Broadcast updated wait times
    broadcastWaitTimeUpdate(req, table.restaurantId);

    res.json({
      message: `Table marked as ${status}`,
      table
    });
  } catch (error) {
    console.error('Update table status error:', error);
    res.status(500).json({ message: 'Server error updating table status.', error: error.message || 'Unknown error' });
  }
};

// Update restaurant logo
const updateLogo = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'Logo image is required.' });
    }

    const logoUrl = req.file.location;
    await Restaurant.findByIdAndUpdate(restaurantId, { logo: logoUrl });

    res.json({
      message: 'Logo updated successfully',
      logoUrl
    });
  } catch (error) {
    console.error('Update logo error:', error);
    res.status(500).json({ message: 'Server error updating logo.', error: error.message || 'Unknown error' });
  }
};

// Create Walk-in Booking (Quick Seat)
const createWalkIn = async (req, res) => {
  try {
    const { tableId, partySize } = req.body;

    if (!tableId) {
      return res.status(400).json({ message: 'Table ID is required.' });
    }

    const table = await Table.findById(tableId);
    if (!table) {
      return res.status(404).json({ message: 'Table not found.' });
    }

    if (table.status !== 'available') {
      return res.status(400).json({ message: `Table is currently ${table.status}.` });
    }

    // Default to table capacity if party size not provided
    const size = partySize || table.capacity;

    const now = new Date();
    
    // Create "Walk-in" booking
    const booking = new Booking({
      restaurantId: table.restaurantId,
      customerName: 'Walk-in Guest',
      customerPhone: 'N/A',
      partySize: size,
      status: 'seated',
      waitTime: 0,
      checkInTime: now,
      seatedAt: now,
      tableId: table._id,
      isCustomParty: false
    });

    await booking.save();

    // Update Table
    table.status = 'occupied';
    table.currentBookingId = booking._id;
    table.seatedAt = now;
    await table.save();

    // Emit SSE events
    const sseEmitter = req.app.get('sseEmitter');
    if (sseEmitter) {
      sseEmitter.emit('booking', { 
        restaurantId: table.restaurantId, 
        type: 'new_booking', 
        booking 
      });
      sseEmitter.emit('table', { 
        restaurantId: table.restaurantId, 
        type: 'status_change', 
        table 
      });
    }

    // Broadcast updated wait times
    broadcastWaitTimeUpdate(req, table.restaurantId);

    res.status(201).json({
      message: 'Walk-in seated successfully',
      booking,
      table
    });

  } catch (error) {
    console.error('Create walk-in error:', error);
    res.status(500).json({ message: 'Server error creating walk-in.', error: error.message || 'Unknown error' });
  }
};

module.exports = {
  requestLoginOTP,
  verifyLoginOTP,
  getSettings,
  updateSettings,
  getDashboardData,
  updateTables,
  updateTableStatus,
  updateLogo,
  createWalkIn,
  getMessages
};