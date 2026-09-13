const generateRandomString = (length = 10) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
};

const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return '';
  
  // Check if the number has a country code, if not add +1 (US/CA)
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  } else {
    return `+${cleaned}`;
  }
};

/**
 * Flexible restaurant lookup by phone number.
 * Matches across all formatting variations (spaces, dashes, parentheses, country codes)
 * and automatically heals/normalizes stored records in the database.
 */
const findRestaurantByPhone = async (phone) => {
  if (!phone) return null;
  const Restaurant = require('../models/Restaurant');
  
  const raw = String(phone).trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits || digits.length < 7) return null;

  const normalized = formatPhoneNumber(raw);

  // 1. Direct query with common exact variations
  const directMatches = [normalized, raw, digits, `+${digits}`];
  if (digits.length === 10) {
    directMatches.push(`+1${digits}`, `1${digits}`);
  } else if (digits.length === 11 && digits.startsWith('1')) {
    directMatches.push(digits.substring(1), `+${digits.substring(1)}`);
  }

  let restaurant = await Restaurant.findOne({ phone: { $in: directMatches } });
  if (restaurant) {
    // If phone in DB was unnormalized, auto-heal to E.164
    if (restaurant.phone !== normalized && normalized) {
      restaurant.phone = normalized;
      await restaurant.save().catch(err => console.warn('[findRestaurantByPhone] Auto-heal error:', err.message));
    }
    return restaurant;
  }

  // 2. Flexible regex query: allows optional spaces, hyphens, brackets, dots between digits
  const digitPattern = digits.split('').join('[\\s\\-\\(\\)\\.]*');
  restaurant = await Restaurant.findOne({
    phone: new RegExp(`^\\+?[\\s\\-\\(\\)\\.]*${digitPattern}[\\s\\-\\(\\)\\.]*$`, 'i')
  });

  if (restaurant) {
    if (restaurant.phone !== normalized && normalized) {
      restaurant.phone = normalized;
      await restaurant.save().catch(err => console.warn('[findRestaurantByPhone] Auto-heal error:', err.message));
    }
    return restaurant;
  }

  // 3. Fallback for North American 10-digit numbers matching against +1... or vice-versa
  if (digits.length === 10) {
    const naPattern = `(1[\\s\\-\\(\\)\\.]*)?` + digits.split('').join('[\\s\\-\\(\\)\\.]*');
    restaurant = await Restaurant.findOne({
      phone: new RegExp(`^\\+?[\\s\\-\\(\\)\\.]*${naPattern}[\\s\\-\\(\\)\\.]*$`, 'i')
    });
  } else if (digits.length === 11 && digits.startsWith('1')) {
    const tenDigits = digits.substring(1);
    const tenPattern = tenDigits.split('').join('[\\s\\-\\(\\)\\.]*');
    restaurant = await Restaurant.findOne({
      phone: new RegExp(`^\\+?[\\s\\-\\(\\)\\.]*${tenPattern}[\\s\\-\\(\\)\\.]*$`, 'i')
    });
  }

  // 4. Universal last-10-digits fallback (e.g. user typed 10 digits or had +1 prefix while registered as +91)
  if (!restaurant && digits.length >= 10) {
    const last10 = digits.slice(-10);
    const last10Pattern = last10.split('').join('[\\s\\-\\(\\)\\.]*');
    restaurant = await Restaurant.findOne({
      phone: new RegExp(`${last10Pattern}$`, 'i')
    });
  }

  if (restaurant && restaurant.phone !== normalized && normalized) {
    const storedDigits = (restaurant.phone || '').replace(/\D/g, '');
    const normDigits = (normalized || '').replace(/\D/g, '');
    // Only auto-heal if country codes align, preserving international prefixes
    if (storedDigits.startsWith('1') === normDigits.startsWith('1') && storedDigits.length === normDigits.length) {
      restaurant.phone = normalized;
      await restaurant.save().catch(err => console.warn('[findRestaurantByPhone] Auto-heal error:', err.message));
    }
  }

  return restaurant;
};

module.exports = {
  generateRandomString,
  formatPhoneNumber,
  findRestaurantByPhone
};