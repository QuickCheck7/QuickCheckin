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
  const raw = String(phone).trim();
  const cleaned = raw.replace(/\D/g, '');
  if (!cleaned) return '';
  
  // If explicitly prefixed with +, preserve all international digits in standard E.164
  if (raw.startsWith('+')) {
    return `+${cleaned}`;
  }
  
  // 10 digits without country prefix defaults to North America (+1)
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // 11 digits starting with 1 is North America with country code
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  // Any other international length (7-15 digits)
  return `+${cleaned}`;
};

/**
 * Flexible restaurant lookup by phone number.
 * Matches across all countries and formatting variations (spaces, dashes, parentheses, country codes).
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
    return restaurant;
  }

  // 2. Flexible regex query: allows optional spaces, hyphens, brackets, dots between digits
  const digitPattern = digits.split('').join('[\\s\\-\\(\\)\\.]*');
  restaurant = await Restaurant.findOne({
    phone: new RegExp(`^\\+?[\\s\\-\\(\\)\\.]*${digitPattern}[\\s\\-\\(\\)\\.]*$`, 'i')
  });
  if (restaurant) {
    return restaurant;
  }

  // 3. Fallback for North American 10-digit numbers matching against +1... or vice-versa
  if (digits.length === 10) {
    const naPattern = `(1[\\s\\-\\(\\)\\.]*)?` + digits.split('').join('[\\s\\-\\(\\)\\.]*');
    restaurant = await Restaurant.findOne({
      phone: new RegExp(`^\\+?[\\s\\-\\(\\)\\.]*${naPattern}[\\s\\-\\(\\)\\.]*$`, 'i')
    });
    if (restaurant) return restaurant;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    const tenDigits = digits.substring(1);
    const tenPattern = tenDigits.split('').join('[\\s\\-\\(\\)\\.]*');
    restaurant = await Restaurant.findOne({
      phone: new RegExp(`^\\+?[\\s\\-\\(\\)\\.]*${tenPattern}[\\s\\-\\(\\)\\.]*$`, 'i')
    });
    if (restaurant) return restaurant;
  }

  // 4. Universal suffix fallback for ANY country (supports 7 to 15 digits)
  // Matches any stored restaurant whose phone ends with these digits
  if (digits.length >= 7) {
    const suffixPattern = digits.split('').join('[\\s\\-\\(\\)\\.]*');
    restaurant = await Restaurant.findOne({
      phone: new RegExp(`${suffixPattern}$`, 'i')
    });
    if (restaurant) return restaurant;

    // If input had a 1-3 digit country code prefix (e.g. +1, +44, +91), also try matching without leading country code
    for (let prefixLen = 1; prefixLen <= 3; prefixLen++) {
      if (digits.length - prefixLen >= 7) {
        const subDigits = digits.substring(prefixLen);
        const subPattern = subDigits.split('').join('[\\s\\-\\(\\)\\.]*');
        restaurant = await Restaurant.findOne({
          phone: new RegExp(`${subPattern}$`, 'i')
        });
        if (restaurant) return restaurant;
      }
    }
  }

  return restaurant;
};

module.exports = {
  generateRandomString,
  formatPhoneNumber,
  findRestaurantByPhone
};