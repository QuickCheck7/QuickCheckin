const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Table = require('../models/Table');
const PartyDuration = require('../models/PartyDuration');

/**
 * Smart Wait Time Calculator with Queue Simulation
 * 
 * Algorithm:
 * 1. Initialize "Free At" times for all tables based on current status (Available vs Occupied).
 * 2. Fetch active waitlist (bookings waiting to be seated).
 * 3. Simulate seating the waitlist FCFS (First-Come-First-Served) onto compatible tables.
 *    - Update "Free At" times as virtual bookings take up slots.
 * 4. Find the best slot for the *new* inquiry based on the post-simulation state.
 */
const calculateWaitTime = async (restaurantId, partySize) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const TURNAROUND_BUFFER = 5; // 5 minutes for cleaning/seating

    // 1. Fetch Configuration & Data
    // ---------------------------------------------------------
    const [tables, activeBookings, partyDurations] = await Promise.all([
      // Active tables
      Table.find({ 
        restaurantId: new mongoose.Types.ObjectId(restaurantId), 
        isActive: true,
        status: { $nin: ['unavailable', 'reserved'] }
      }).sort({ capacity: 1 }), // Sort by capacity for preference logic

      // Waitlist queue (excluding seeded/cancelled/completed, AND from today only)
      Booking.find({
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        status: { $in: ['waiting', 'notified', 'confirmed'] },
        createdAt: { $gte: startOfDay }
      }).sort({ createdAt: 1 }), // Oldest first (FIFO)

      // Party Durations Lookup
      PartyDuration.find({})
    ]);

    console.log(`[WaitTime] Calculator Start - Restaurant: ${restaurantId}, PartySize: ${partySize}`);
    console.log(`[WaitTime] Data: ${tables.length} Tables, ${activeBookings.length} ActiveBookings, ${partyDurations.length} DurationsConfig`);
    if (partyDurations.length > 0) {
       console.log(`[WaitTime] Durations Map: ${JSON.stringify(partyDurations)}`);
    }

    // Create a Duration Map for O(1) lookup
    // Map party size to duration (minutes)
    const durationMap = new Map();
    partyDurations.forEach(pd => durationMap.set(pd.partySize, pd.avgDuration));
    
    // Helper to get duration
    const getDuration = (size) => {
      // Exact match
      if (durationMap.has(size)) return durationMap.get(size);
      
      // Closest larger size (if configured 2, 4, 6 and size is 3 -> use 4's duration)
      // If we don't have configured durations, fallback to logic or default 90
      const sizes = Array.from(durationMap.keys()).sort((a, b) => a - b);
      const larger = sizes.find(s => s >= size);
      
      if (larger) return durationMap.get(larger);
      
      // Absolute fallback if map is empty
      return 90;
    };


    // 2. Initialize Table Availability Timeline
    // ---------------------------------------------------------
    // Map: TableID -> Date (When it will be free)
    const tableTimeline = new Map();

    for (const table of tables) {
      if (table.status === 'available') {
        // Available now (plus buffer for immediate seating)
        tableTimeline.set(table._id.toString(), new Date(now.getTime() + TURNAROUND_BUFFER * 60000));
        console.log(`[WaitTime] Table ${table.tableNumber} (Available) -> FreeAt: ${new Date(now.getTime() + TURNAROUND_BUFFER * 60000).toISOString()}`);
      } else {
        // Occupied/Cleaning/Reserved
        // Determine when it frees up
        let minutesUntilFree = 0;

        if (table.status === 'occupied') {
          // If occupied, calculate remaining time
          const startTime = table.seatedAt || table.updatedAt || now; // Fallback to updatedAt/now if seatedAt missing
          
          // We need expected duration for the CURRENT occupant. 
          const duration = getDuration(table.capacity); 
          const elapsed = (now - new Date(startTime)) / 60000;
          minutesUntilFree = Math.max(0, duration - elapsed);
          console.log(`[WaitTime] Table ${table.tableNumber} (Occupied) -> Duration: ${duration}, Start: ${startTime}, Elapsed: ${elapsed.toFixed(1)}, MinsFree: ${minutesUntilFree}`);
        } else {
          // Cleaning/Reserved -> assume nearly ready
          minutesUntilFree = 10;
          console.log(`[WaitTime] Table ${table.tableNumber} (${table.status}) -> Default MinsFree: ${minutesUntilFree}`);
        }

        const freeAt = new Date(now.getTime() + (minutesUntilFree + TURNAROUND_BUFFER) * 60000);
        tableTimeline.set(table._id.toString(), freeAt);
      }
    }


    // 3. Simulate The Queue (Virtual Seating) - STRICT TABLE MATCHING
    // ---------------------------------------------------------
    for (const booking of activeBookings) {
      // STRICT MATCHING: Prefer exact capacity match
      const exactMatchTables = tables.filter(t => t.capacity === booking.partySize);
      
      // Fallback: If no exact match exists, use smallest table that fits
      let compatibleTables;
      if (exactMatchTables.length > 0) {
        compatibleTables = exactMatchTables;
      } else {
        // Find smallest table that can fit the party
        const largerTables = tables.filter(t => t.capacity >= booking.partySize);
        compatibleTables = largerTables.length > 0 
          ? [largerTables.sort((a, b) => a.capacity - b.capacity)[0]] 
          : [];
      }

      if (compatibleTables.length > 0) {
        // Find the one that becomes free EARLIEST
        let bestTable = null;
        let earliestFreeTime = null;

        for (const table of compatibleTables) {
          const tableFreeAt = tableTimeline.get(table._id.toString());
          
          if (!bestTable || tableFreeAt < earliestFreeTime) {
            bestTable = table;
            earliestFreeTime = tableFreeAt;
          }
        }

        // 'Assign' this booking to that table
        // New Free Time = (Wait for table) + (Dining Duration) + (Buffer)
        const diningDuration = getDuration(booking.partySize);
        
        // The booking starts dining either NOW (if table ready) or when table frees up
        const diningStartTime = earliestFreeTime < now ? now : earliestFreeTime;
        const newFreeTime = new Date(diningStartTime.getTime() + (diningDuration + TURNAROUND_BUFFER) * 60000);

        // Update timeline
        tableTimeline.set(bestTable._id.toString(), newFreeTime);
        console.log(`[WaitTime] Queue Sim: Booking (Party ${booking.partySize}) -> Table ${bestTable.tableNumber} (Cap ${bestTable.capacity}), NewFreeAt: ${newFreeTime.toISOString()}`);
      }
      // If no compatible tables, this booking is stuck (phantom), we ignore it for simulation to prevent blocking
    }


    // 4. Calculate "My" Wait Time (Post-Simulation) - STRICT TABLE MATCHING
    // ---------------------------------------------------------
    // Now the timeline reflects the state AFTER all current waiters are served.
    
    // STRICT MATCHING: First look for exact capacity match
    const exactMatchTables = tables.filter(t => t.capacity === partySize);
    
    let myCompatibleTables;
    if (exactMatchTables.length > 0) {
      // Use only exact-match tables
      myCompatibleTables = exactMatchTables;
      console.log(`[WaitTime] STRICT: Found ${exactMatchTables.length} exact-match tables for party of ${partySize}`);
    } else {
      // Fallback: No exact match exists, use smallest table that fits
      const largerTables = tables.filter(t => t.capacity >= partySize);
      myCompatibleTables = largerTables.length > 0
        ? [largerTables.sort((a, b) => a.capacity - b.capacity)[0]]
        : [];
      console.log(`[WaitTime] STRICT: No exact-match tables for party of ${partySize}, using smallest fit: ${myCompatibleTables.map(t => t.tableNumber).join(', ')}`);
    }

    if (myCompatibleTables.length === 0) {
      return { waitTime: 60, message: 'No suitable tables available' };
    }

    // Find my best slot
    let myEarliestFreeTime = null;

    for (const table of myCompatibleTables) {
      const freeAt = tableTimeline.get(table._id.toString());
      // Debug Log
      console.log(`[WaitTime] Table ${table.tableNumber} (Cap ${table.capacity}) Status: ${table.status}, FreeAt: ${freeAt.toISOString()}, DurationUsed: ${getDuration(table.capacity)}`);
      
      if (!myEarliestFreeTime || freeAt < myEarliestFreeTime) {
        myEarliestFreeTime = freeAt;
      }
    }

    // Result
    let waitMinutes = Math.ceil((myEarliestFreeTime - now) / 60000);
    waitMinutes = Math.max(0, waitMinutes); // No negative time

    console.log(`[WaitTime] Final Calc for PartySize ${partySize}: ${waitMinutes}m`);

    // Format message
    let message = '';
    if (waitMinutes <= 5) {
      message = 'Table available shortly';
    } else {
      message = `Estimated wait: ${waitMinutes} minutes`;
    }

    return {
      waitTime: waitMinutes,
      tableId: null, // Specific table is unpredictable in simulation
      message
    };

  } catch (error) {
    console.error('Error calculating wait time:', error);
    return { waitTime: 30, message: 'Default wait time' }; // Fallback
  }
};

/**
 * Get dynamic wait time range for display
 * Returns { min: X, max: Y } for "X-Y minutes" display
 */
const getWaitTimeRange = async (restaurantId, partySize) => {
  const result = await calculateWaitTime(restaurantId, partySize);
  const waitTime = result.waitTime;
  
  // Create a range (±5 minutes)
  const min = Math.max(5, waitTime - 5);
  const max = waitTime + 5;
  
  return {
    min,
    max,
    exact: waitTime,
    tableId: result.tableId,
    message: result.message
  };
};

module.exports = { calculateWaitTime, getWaitTimeRange };