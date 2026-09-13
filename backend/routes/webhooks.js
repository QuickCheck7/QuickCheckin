/**
 * Stripe Webhook Handler
 * Processes Stripe webhook events for subscription management
 */

const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const SubscriptionHistory = require('../models/SubscriptionHistory');
const { sendSMS, formatPhoneNumber } = require('../utils/telnyxService');
const { stripe, getPriceForRestaurant } = require('../utils/stripeService');

/**
 * Stripe Webhook Endpoint
 * POST /api/webhooks/stripe
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[Stripe Webhook] Received: ${event.type}`);

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error(`Error handling webhook ${event.type}:`, error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// ============================================
// Webhook Event Handlers
// ============================================

async function handleSubscriptionCreated(subscription) {
  console.log('[Webhook] Subscription created:', subscription.id);
  
  const restaurant = await Restaurant.findOne({ stripeCustomerId: subscription.customer });
  if (!restaurant) {
    console.error('Restaurant not found for customer:', subscription.customer);
    return;
  }

  await SubscriptionHistory.create({
    restaurantId: restaurant._id,
    action: 'created',
    toPlan: restaurant.subscriptionPlan,
    stripeSubscriptionId: subscription.id,
    metadata: {
      trialEnd: subscription.trial_end,
      status: subscription.status
    }
  });
}

async function handleSubscriptionUpdated(subscription) {
  console.log('[Webhook] Subscription updated:', subscription.id);
  
  const restaurant = await Restaurant.findOne({ stripeSubscriptionId: subscription.id });
  if (!restaurant) {
    console.error('Restaurant not found for subscription:', subscription.id);
    return;
  }

  // Check if pending downgrade should be applied
  if (restaurant.pendingPlanChange === 'small' && subscription.status === 'active') {
    // Apply downgrade at billing cycle
    const currentPeriodStart = new Date(subscription.current_period_start * 1000);
    const lastBillingDate = restaurant.nextBillingDate;

    // Check if we're at new billing cycle
    if (currentPeriodStart > lastBillingDate) {
      const { priceId } = getPriceForRestaurant(restaurant.country, 25); // Small plan
      
      await stripe.subscriptions.update(subscription.id, {
        items: [{
          id: subscription.items.data[0].id,
          price: priceId
        }],
        proration_behavior: 'none' // No proration on downgrade
      });

      restaurant.subscriptionPlan = 'small';
      restaurant.pendingPlanChange = null;
      
      await SubscriptionHistory.create({
        restaurantId: restaurant._id,
        action: 'downgraded',
        fromPlan: 'large',
        toPlan: 'small',
        metadata: { appliedAtBillingCycle: true }
      });
    }
  }

  // Update restaurant subscription status
  restaurant.subscriptionStatus = subscription.status;
  restaurant.nextBillingDate = new Date(subscription.current_period_end * 1000);
  await restaurant.save();
}

async function handleSubscriptionDeleted(subscription) {
  console.log('[Webhook] Subscription deleted:', subscription.id);
  
  const restaurant = await Restaurant.findOne({ stripeSubscriptionId: subscription.id });
  if (!restaurant) {
    console.error('Restaurant not found for subscription:', subscription.id);
    return;
  }

  restaurant.subscriptionStatus = 'canceled';
  restaurant.isActive = false;
  restaurant.subscriptionEndDate = new Date();
  await restaurant.save();

  await SubscriptionHistory.create({
    restaurantId: restaurant._id,
    action: 'canceled',
    fromPlan: restaurant.subscriptionPlan,
    metadata: { canceledAt: new Date() }
  });

  // Send SMS
  const smsMsg = `Your QuickCheck subscription has been canceled. Your data will be retained for 30 days. Reply HELP if this was a mistake.`;
  await sendSMS(formatPhoneNumber(restaurant.phone), smsMsg);
}

async function handleTrialWillEnd(subscription) {
  console.log('[Webhook] Trial will end:', subscription.id);
  
  const restaurant = await Restaurant.findOne({ stripeSubscriptionId: subscription.id });
  if (!restaurant) return;

  const trialEndDate = new Date(subscription.trial_end * 1000);
  const daysUntilEnd = Math.ceil((trialEndDate - new Date()) / (1000 * 60 * 60 * 24));

  // Get payment method
  const customer = await stripe.customers.retrieve(restaurant.stripeCustomerId);
  const last4 = customer.invoice_settings?.default_payment_method ? '****' : 'none';
  
  const amount = restaurant.subscriptionPlan === 'small' ? 299 : 499;
  const currency = restaurant.country === 'CA' ? 'CAD' : 'USD';

  // Send SMS
  const smsMsg = `Hi ${restaurant.name}, your free trial ends in ${daysUntilEnd} days. Your card ending in ${last4} will be charged $${amount} ${currency} on ${trialEndDate.toLocaleDateString()}.`;
  await sendSMS(formatPhoneNumber(restaurant.phone), smsMsg);
}

async function handlePaymentSucceeded(invoice) {
  console.log('[Webhook] Payment succeeded:', invoice.id);
  
  const restaurant = await Restaurant.findOne({ stripeCustomerId: invoice.customer });
  if (!restaurant) return;

  restaurant.lastPaymentDate = new Date();
  // restaurant.subscriptionStatus = 'active'; // REmoved to rely on subscription.updated event
  restaurant.isActive = true;
  await restaurant.save();

  await SubscriptionHistory.create({
    restaurantId: restaurant._id,
    action: 'payment_succeeded',
    amount: invoice.amount_paid,
    currency: invoice.currency.toUpperCase(),
    stripeInvoiceId: invoice.id,
    stripePaymentIntentId: invoice.payment_intent,
    metadata: {
      periodStart: new Date(invoice.period_start * 1000),
      periodEnd: new Date(invoice.period_end * 1000)
    }
  });

  // Send SMS to Super Admin for paid customer payment
  try {
    const adminPhone = process.env.SUPER_ADMIN_PHONE || '+16472216677';
    const amountFormatted = Math.round((invoice.amount_paid || 0) / 100);
    const adminMsg = `QuickCheck - New Paid Customer\nRestaurant: ${restaurant.name}\nPlan: $${amountFormatted}/month\nPayment successful.`;
    await sendSMS(adminPhone, adminMsg);
  } catch (err) {
    console.error('Failed to send Super Admin payment SMS:', err);
  }
}

async function handlePaymentFailed(invoice) {
  console.log('[Webhook] Payment failed:', invoice.id);
  
  const restaurant = await Restaurant.findOne({ stripeCustomerId: invoice.customer });
  if (!restaurant) return;

  restaurant.subscriptionStatus = 'past_due';
  await restaurant.save();

  await SubscriptionHistory.create({
    restaurantId: restaurant._id,
    action: 'payment_failed',
    amount: invoice.amount_due,
    currency: invoice.currency.toUpperCase(),
    stripeInvoiceId: invoice.id,
    metadata: {
      attemptCount: invoice.attempt_count,
      nextPaymentAttempt: invoice.next_payment_attempt
    }
  });

  // Send SMS
  const updateLink = 'https://www.quickcheckin.ca/admin/subscription';
  const smsMsg = `Payment failed for QuickCheck subscription. Update your payment method at ${updateLink} to avoid service interruption.`;
  await sendSMS(formatPhoneNumber(restaurant.phone), smsMsg);

  // If final attempt failed (Stripe stops retrying after 3-4 attempts)
  if (invoice.attempt_count >= 3 && invoice.next_payment_attempt === null) {
    restaurant.subscriptionStatus = 'unpaid';
    restaurant.isActive = false;
    await restaurant.save();

    const suspendMsg = `Your QuickCheck service has been suspended due to failed payment. Update payment to reactivate: ${updateLink}`;
    await sendSMS(formatPhoneNumber(restaurant.phone), suspendMsg);
  }
}

async function handleChargeRefunded(charge) {
  console.log('[Webhook] Charge refunded:', charge.id);
  
  const restaurant = await Restaurant.findOne({ stripeCustomerId: charge.customer });
  if (!restaurant) return;

  await SubscriptionHistory.create({
    restaurantId: restaurant._id,
    action: 'refunded',
    amount: charge.amount_refunded,
    currency: charge.currency.toUpperCase(),
    stripeChargeId: charge.id,
    metadata: {
      refundReason: charge.refunds?.data[0]?.reason || 'unknown',
      refundedAt: new Date()
    }
  });
}

module.exports = router;
