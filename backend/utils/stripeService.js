/**
 * Stripe Utility Functions
 * Handles Stripe API interactions for subscriptions
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Get Stripe Price ID based on country and seat capacity
 * @param {string} country - 'US' or 'CA'
 * @param {number} seatCapacity - Number of seats
 * @returns {object} - { priceId, plan, amount, currency }
 */
const getPriceForRestaurant = (country, seatCapacity) => {
  const plan = seatCapacity > 50 ? 'large' : 'small';
  const amount = plan === 'small' ? 299 : 499;
  const currency = country === 'CA' ? 'CAD' : 'USD';

  // Map to actual Stripe Price IDs (set these in .env)
  const priceMap = {
    'US-small': process.env.STRIPE_PRICE_US_SMALL,
    'US-large': process.env.STRIPE_PRICE_US_LARGE,
    'CA-small': process.env.STRIPE_PRICE_CA_SMALL,
    'CA-large': process.env.STRIPE_PRICE_CA_LARGE
  };

  const priceId = priceMap[`${country}-${plan}`];

  if (!priceId) {
    throw new Error(`No Stripe price configured for ${country}-${plan}`);
  }

  return { priceId, plan, amount, currency };
};

/**
 * Create Stripe Customer
 */
const createStripeCustomer = async ({ email, name, phone, metadata }) => {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      phone,
      metadata
    });
    return { success: true, customer };
  } catch (error) {
    console.error('Stripe customer creation error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create Stripe Subscription with trial
 */
const createStripeSubscription = async ({ customerId, priceId, trialDays = 30, trialEnd }) => {
  try {
    const subscriptionData = {
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        source: 'quickcheck_signup'
      }
    };

    // If a specific timestamp is provided, use it (for testing/overrides)
    if (trialEnd) {
      subscriptionData.trial_end = trialEnd;
    } else if (trialDays > 0) {
      // Otherwise use the standard day count
      subscriptionData.trial_period_days = trialDays;
    }

    const subscription = await stripe.subscriptions.create(subscriptionData);
    return { success: true, subscription };
  } catch (error) {
    console.error('Stripe subscription creation error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update Stripe Subscription (upgrade/downgrade)
 */
const updateStripeSubscription = async ({ subscriptionId, newPriceId, prorationBehavior = 'create_prorations' }) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    const updated = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId
      }],
      proration_behavior: prorationBehavior
    });
    
    return { success: true, subscription: updated };
  } catch (error) {
    console.error('Stripe subscription update error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Cancel Stripe Subscription
 */
const cancelStripeSubscription = async (subscriptionId, immediate = false) => {
  try {
    let cancelled;
    if (immediate) {
      cancelled = await stripe.subscriptions.cancel(subscriptionId);
    } else {
      cancelled = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });
    }
    return { success: true, subscription: cancelled };
  } catch (error) {
    console.error('Stripe subscription cancel error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create Setup Intent (for payment method update)
 */
const createSetupIntent = async (customerId) => {
  try {
    const intent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card']
    });
    return { success: true, clientSecret: intent.client_secret };
  } catch (error) {
    console.error('Stripe setup intent error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  getPriceForRestaurant,
  createStripeCustomer,
  createStripeSubscription,
  updateStripeSubscription,
  cancelStripeSubscription,
  createSetupIntent,
  stripe // Export for direct use
};
