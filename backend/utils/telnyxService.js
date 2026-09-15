const https = require('https');
const axios = require('axios');
const telnyx = require('telnyx')(process.env.TELNYX_API_KEY);

// Persistent HTTPS agent to reuse TLS sockets and eliminate TLS handshake delay
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  keepAliveMsecs: 30000
});

// Format phone number for Telnyx (E.164)
const formatPhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') return '';
  const raw = phone.trim();
  const cleaned = raw.replace(/\D/g, '');
  if (!cleaned) return '';

  // If already prefixed with +, preserve all international digits in standard E.164
  if (raw.startsWith('+')) {
    return `+${cleaned}`;
  }

  // 12 digits starting with 91 is India with country code
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
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

  // Any other international length
  return `+${cleaned}`;
};

const TELNYX_FROM = (process.env.TELNYX_PHONE_NUMBER || '').replace(/\D/g, ''); // digits only for sanity
const MESSAGING_PROFILE_ID = process.env.TELNYX_MESSAGING_PROFILE_ID; // add this to .env

const sendSMS = async (to, message, maxRetries = 2) => {
  // 1. Validate destination number before making any network call
  if (!to || typeof to !== 'string') {
    console.warn('[Telnyx] No destination phone number provided. Skipping SMS.');
    return { success: false, error: 'Missing destination phone number' };
  }

  const cleanedDigits = to.replace(/\D/g, '');
  if (cleanedDigits.length < 7) {
    console.warn(`[Telnyx] Invalid destination phone number "${to}" (less than 7 digits). Skipping SMS.`);
    return { success: false, error: 'Invalid destination phone number' };
  }

  const formattedTo = formatPhoneNumber(to);
  if (!TELNYX_FROM) {
    console.error('[Telnyx] TELNYX_PHONE_NUMBER not configured.');
    return { success: false, error: 'TELNYX_PHONE_NUMBER not configured' };
  }

  const fromNumberE164 = `+${TELNYX_FROM}`;
  const payload = {
    from: fromNumberE164,
    to: formattedTo,
    text: message
  };

  if (MESSAGING_PROFILE_ID) payload.messaging_profile_id = MESSAGING_PROFILE_ID;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Direct REST call with persistent HTTP keep-alive agent and 10s timeout
      const axiosResp = await axios.post(
        'https://api.telnyx.com/v2/messages',
        payload,
        {
          httpsAgent,
          timeout: 10000,
          headers: {
            Authorization: `Bearer ${process.env.TELNYX_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const messageId = axiosResp.data?.data?.id ?? null;
      console.log(`[Telnyx] ✅ SMS sent successfully to ${formattedTo} (ID: ${messageId})`);
      return { success: true, messageId };

    } catch (error) {
      const statusCode = error.response?.status;
      const errorData = error.response?.data;

      console.error(`[Telnyx] ⚠️ Attempt ${attempt} failed for ${formattedTo} (Status ${statusCode || 'NET'}):`, 
        errorData ? JSON.stringify(errorData) : error.message
      );

      // Never retry on 4xx client errors (e.g. invalid phone number, bad auth, unroutable destination)
      if (statusCode && statusCode >= 400 && statusCode < 500) {
        console.warn(`[Telnyx] Client error (${statusCode}). Aborting retries immediately.`);
        return {
          success: false,
          error: errorData?.errors?.[0]?.detail || error.message || `Client error ${statusCode}`
        };
      }

      if (attempt === maxRetries) {
        return {
          success: false,
          error: error.message || 'SMS delivery failed after retries'
        };
      }

      // Short 500ms backoff for transient server/network hiccups
      await new Promise(resolve => setTimeout(resolve, 500 * attempt));
    }
  }
};

module.exports = {
  telnyx,
  formatPhoneNumber,
  sendSMS
};