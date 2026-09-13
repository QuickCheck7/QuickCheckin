const Restaurant = require('../models/Restaurant');
const Session = require('../models/Session');
const Booking = require('../models/Booking');
const { formatPhoneNumber } = require('./helpers');

/**
 * Normalizes all existing customer & restaurant data in MongoDB:
 * 1. Normalizes phone numbers (strips spaces, dashes, brackets, normalizes to E.164 standard)
 * 2. Cleans business numbers (extracts digits, removes "BN-", spaces, suffixes)
 * 3. Sets safe defaults for address, postalCode, country, and subscription status
 * 4. Normalizes active sessions and customer booking phone numbers
 */
const runDataMigration = async () => {
  try {
    console.log('[Migration] Starting automatic data normalization check for existing records...');

    // 1. Normalize Restaurants
    const restaurants = await Restaurant.find({});
    let restaurantsUpdated = 0;

    for (const r of restaurants) {
      let changed = false;

      // Phone normalization: removes spaces, brackets, hyphens
      if (r.phone) {
        const normalized = formatPhoneNumber(r.phone);
        if (normalized && r.phone !== normalized) {
          console.log(`[Migration] Normalizing phone for restaurant "${r.name}": "${r.phone}" -> "${normalized}"`);
          r.phone = normalized;
          changed = true;
        }
      }

      // Business Number normalization: clean digits only
      if (r.businessNumber) {
        const cleanBN = r.businessNumber.replace(/\D/g, '');
        if (cleanBN && r.businessNumber !== cleanBN) {
          console.log(`[Migration] Normalizing businessNumber for restaurant "${r.name}": "${r.businessNumber}" -> "${cleanBN}"`);
          r.businessNumber = cleanBN;
          changed = true;
        }
      }

      // Address & Postal Code safety defaults
      if (r.address === undefined || r.address === null) {
        r.address = '';
        changed = true;
      }
      if (r.postalCode === undefined || r.postalCode === null) {
        r.postalCode = '';
        changed = true;
      }

      // Country & Subscription defaults for legacy accounts
      if (!r.country) {
        r.country = 'CA';
        changed = true;
      }
      if (!r.subscriptionStatus) {
        r.subscriptionStatus = 'legacy-free';
        changed = true;
      }
      if (!r.subscriptionPlan) {
        r.subscriptionPlan = 'legacy-free';
        changed = true;
      }

      if (changed) {
        await r.save();
        restaurantsUpdated++;
      }
    }

    // 2. Normalize Sessions
    const sessions = await Session.find({});
    let sessionsUpdated = 0;
    for (const s of sessions) {
      if (s.phone) {
        const normalized = formatPhoneNumber(s.phone);
        if (normalized && s.phone !== normalized) {
          s.phone = normalized;
          await s.save();
          sessionsUpdated++;
        }
      }
    }

    // 3. Normalize Active & Waiting Bookings
    const bookings = await Booking.find({
      status: { $in: ['waiting', 'notified', 'confirmed', 'seated'] }
    });
    let bookingsUpdated = 0;
    for (const b of bookings) {
      if (b.customerPhone) {
        const normalized = formatPhoneNumber(b.customerPhone);
        if (normalized && b.customerPhone !== normalized) {
          b.customerPhone = normalized;
          await b.save();
          bookingsUpdated++;
        }
      }
    }

    console.log(`[Migration] Data normalization complete. Updated: ${restaurantsUpdated} restaurants, ${sessionsUpdated} sessions, ${bookingsUpdated} active bookings.`);
  } catch (err) {
    console.error('[Migration] Error during data normalization:', err.message);
  }
};

module.exports = { runDataMigration };
