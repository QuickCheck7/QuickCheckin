/**
 * Subscription Controller
 * Handles subscription management (upgrade, downgrade, cancel, payment method)
 */

const Restaurant = require('../models/Restaurant');
const SubscriptionHistory = require('../models/SubscriptionHistory');
const { sendSMS, formatPhoneNumber } = require('../utils/telnyxService');
const {
  getPriceForRestaurant,
  updateStripeSubscription,
  cancelStripeSubscription,
  createSetupIntent,
  stripe
} = require('../utils/stripeService');

/**
 * Get subscription details for a restaurant
 * GET /api/restaurant/:id/subscription
 */
const getSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found.' });
    }

    // Get subscription history
    const history = await SubscriptionHistory.find({ restaurantId: id })
      .sort({ createdAt: -1 })
      .limit(10);

    // If has Stripe subscription, get latest from Stripe
    let stripeSubscription = null;
    if (restaurant.stripeSubscriptionId) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(restaurant.stripeSubscriptionId);
      } catch (error) {
        console.error('Stripe subscription retrieve error:', error);
      }
    }

    res.json({
      subscription: {
        plan: restaurant.subscriptionPlan,
        status: restaurant.subscriptionStatus,
        seatCapacity: restaurant.seatCapacity,
        country: restaurant.country,
        state: restaurant.state,
        trialEnd: restaurant.subscriptionEndDate,
        nextBillingDate: restaurant.nextBillingDate,
        lastPaymentDate: restaurant.lastPaymentDate,
        pendingPlanChange: restaurant.pendingPlanChange,
        stripeCustomerId: restaurant.stripeCustomerId
      },
      stripeSubscription,
      history
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ message: 'Server error fetching subscription.', error: error.message || 'Unknown error' });
  }
};

/**
 * Upgrade subscription (immediate with proration)
 * POST /api/restaurant/:id/subscription/upgrade
 */
const upgradeSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found.' });
    }

    // Validate: must have Stripe subscription
    if (!restaurant.stripeSubscriptionId) {
      return res.status(400).json({ message: 'No active subscription found.' });
    }

    // Validate: must be on small plan
    if (restaurant.subscriptionPlan !== 'small') {
      return res.status(400).json({ message: 'Already on Large plan or legacy plan.' });
    }

    // Get new price
    const { priceId, amount, currency } = getPriceForRestaurant(restaurant.country, 50); // Large plan

    // Update Stripe subscription (immediate with proration)
    const result = await updateStripeSubscription({
      subscriptionId: restaurant.stripeSubscriptionId,
      newPriceId: priceId,
      prorationBehavior: 'create_prorations' // Charge prorated amount immediately
    });

    if (!result.success) {
      return res.status(500).json({ message: 'Failed to upgrade subscription.', error: error.message || 'Unknown error' });
    }

    // Update restaurant
    restaurant.subscriptionPlan = 'large';
    restaurant.pendingPlanChange = null;
    await restaurant.save();

    // Log history
    await SubscriptionHistory.create({
      restaurantId: id,
      action: 'upgraded',
      fromPlan: 'small',
      toPlan: 'large',
      amount: amount * 100,
      currency,
      stripeSubscriptionId: restaurant.stripeSubscriptionId,
      metadata: { prorated: true }
    });

    // Send SMS
    const smsMsg = `You've successfully upgraded to Large plan! Your new features are now active.`;
    await sendSMS(formatPhoneNumber(restaurant.phone), smsMsg);

    res.json({
      message: 'Subscription upgraded successfully',
      subscription: result.subscription
    });
  } catch (error) {
    console.error('Upgrade subscription error:', error);
    res.status(500).json({ message: 'Server error upgrading subscription.', error: error.message || 'Unknown error' });
  }
};

/**
 * Downgrade subscription (scheduled for next billing cycle)
 * POST /api/restaurant/:id/subscription/downgrade
 */
const downgradeSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found.' });
    }

    // Validate: must have Stripe subscription
    if (!restaurant.stripeSubscriptionId) {
      return res.status(400).json({ message: 'No active subscription found.' });
    }

    // Validate: must be on large plan
    if (restaurant.subscriptionPlan !== 'large') {
      return res.status(400).json({ message: 'Already on Small plan or legacy plan.' });
    }

    // Set pending downgrade (will apply at next billing cycle via webhook)
    restaurant.pendingPlanChange = 'small';
    await restaurant.save();

    // Log history
    await SubscriptionHistory.create({
      restaurantId: id,
      action: 'downgraded',
      fromPlan: 'large',
      toPlan: 'small',
      metadata: {
        scheduledFor: restaurant.nextBillingDate,
        pending: true
      }
    });

    // Send SMS
    const billingDate = new Date(restaurant.nextBillingDate).toLocaleDateString();
    const smsMsg = `Your plan will change from Large to Small plan on ${billingDate}. Reply Y to confirm or call support with questions.`;
    await sendSMS(formatPhoneNumber(restaurant.phone), smsMsg);

    res.json({
      message: 'Downgrade scheduled for next billing cycle',
      effectiveDate: restaurant.nextBillingDate
    });
  } catch (error) {
    console.error('Downgrade subscription error:', error);
    res.status(500).json({ message: 'Server error scheduling downgrade.', error: error.message || 'Unknown error' });
  }
};

/**
 * Cancel downgrade (remove pending change)
 * POST /api/restaurant/:id/subscription/cancel-downgrade
 */
const cancelDowngrade = async (req, res) => {
  try {
    const { id } = req.params;

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found.' });
    }

    if (!restaurant.pendingPlanChange) {
      return res.status(400).json({ message: 'No pending downgrade to cancel.' });
    }

    restaurant.pendingPlanChange = null;
    await restaurant.save();

    res.json({ message: 'Downgrade canceled successfully' });
  } catch (error) {
    console.error('Cancel downgrade error:', error);
    res.status(500).json({ message: 'Server error canceling downgrade.', error: error.message || 'Unknown error' });
  }
};

/**
 * Cancel subscription
 * POST /api/restaurant/:id/subscription/cancel
 */
const cancelSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { immediate = false } = req.body;

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found.' });
    }

    if (!restaurant.stripeSubscriptionId) {
      return res.status(400).json({ message: 'No active subscription to cancel.' });
    }

    // Cancel in Stripe
    const result = await cancelStripeSubscription(restaurant.stripeSubscriptionId, immediate);

    if (!result.success) {
      return res.status(500).json({ message: 'Failed to cancel subscription.', error: error.message || 'Unknown error' });
    }

    // Update restaurant
    if (immediate) {
      restaurant.subscriptionStatus = 'canceled';
      restaurant.isActive = false;
    } else {
      restaurant.subscriptionStatus = 'active'; // Still active until period end
    }
    await restaurant.save();

    // Log history
    await SubscriptionHistory.create({
      restaurantId: id,
      action: 'canceled',
      fromPlan: restaurant.subscriptionPlan,
      metadata: {
        immediate,
        canceledAt: new Date(),
        effectiveDate: immediate ? new Date() : restaurant.nextBillingDate
      }
    });

    // Send SMS
    const smsMsg = `Your QuickCheck subscription has been canceled. Your data will be retained for 30 days. Reply HELP if this was a mistake.`;
    await sendSMS(formatPhoneNumber(restaurant.phone), smsMsg);

    res.json({
      message: immediate ? 'Subscription canceled immediately' : 'Subscription will cancel at period end',
      effectiveDate: immediate ? new Date() : restaurant.nextBillingDate
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ message: 'Server error canceling subscription.', error: error.message || 'Unknown error' });
  }
};

/**
 * Update payment method
 * POST /api/restaurant/:id/payment-method
 */
const updatePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethodId } = req.body;

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found.' });
    }

    if (!restaurant.stripeCustomerId) {
      return res.status(400).json({ message: 'No Stripe customer found.' });
    }

    if (!paymentMethodId) {
      return res.status(400).json({ message: 'Payment method ID is required.' });
    }

    // Attach new payment method
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: restaurant.stripeCustomerId
    });

    // Set as default
    await stripe.customers.update(restaurant.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });

    res.json({ message: 'Payment method updated successfully' });
  } catch (error) {
    console.error('Update payment method error:', error);
    res.status(500).json({ message: 'Failed to update payment method.', error: error.message || 'Unknown error' });
  }
};

/**
 * Update seat capacity (may trigger plan change)
 * POST /api/restaurant/:id/seat-capacity
 */
const updateSeatCapacity = async (req, res) => {
  try {
    const { id } = req.params;
    const { seatCapacity } = req.body;

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found.' });
    }

    if (seatCapacity < 1) {
      return res.status(400).json({ message: 'Seat capacity must be at least 1.' });
    }

    const oldCapacity = restaurant.seatCapacity;
    const oldPlan = restaurant.subscriptionPlan;
    const newPlan = seatCapacity > 50 ? 'large' : 'small';

    // Check if plan change is needed
    if (oldPlan !== newPlan && restaurant.stripeSubscriptionId) {
      // Plan change needed
      if (newPlan === 'large') {
        // Auto-upgrade (immediate with proration)
        const { priceId } = getPriceForRestaurant(restaurant.country, seatCapacity);
        
        const result = await updateStripeSubscription({
          subscriptionId: restaurant.stripeSubscriptionId,
          newPriceId: priceId,
          prorationBehavior: 'create_prorations'
        });

        if (!result.success) {
          return res.status(500).json({ message: 'Failed to upgrade plan automatically.', error: error.message || 'Unknown error' });
        }

        restaurant.subscriptionPlan = 'large';
        
        // Log upgrade
        await SubscriptionHistory.create({
          restaurantId: id,
          action: 'upgraded',
          fromPlan: 'small',
          toPlan: 'large',
          metadata: {
            reason: 'seat_capacity_change',
            oldCapacity,
            newCapacity: seatCapacity
          }
        });

      } else {
        // Schedule downgrade (next billing cycle)
        restaurant.pendingPlanChange = 'small';
        
        await SubscriptionHistory.create({
          restaurantId: id,
          action: 'downgraded',
          fromPlan: 'large',
          toPlan: 'small',
          metadata: {
            reason: 'seat_capacity_change',
            scheduledFor: restaurant.nextBillingDate,
            pending: true
          }
        });
      }
    }

    restaurant.seatCapacity = seatCapacity;
    await restaurant.save();

    res.json({
      message: 'Seat capacity updated successfully',
      seatCapacity,
      plan: restaurant.subscriptionPlan,
      pendingPlanChange: restaurant.pendingPlanChange
    });
  } catch (error) {
    console.error('Update seat capacity error:', error);
    res.status(500).json({ message: 'Server error updating seat capacity.', error: error.message || 'Unknown error' });
  }
};

module.exports = {
  getSubscription,
  upgradeSubscription,
  downgradeSubscription,
  cancelDowngrade,
  cancelSubscription,
  updatePaymentMethod,
  updateSeatCapacity
};
