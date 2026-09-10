/**
 * Super Admin Analytics Controller
 * Provides subscription and revenue analytics for Super Admin dashboard
 */

const Restaurant = require('../models/Restaurant');
const SubscriptionHistory = require('../models/SubscriptionHistory');

/**
 * Get revenue statistics
 * GET /api/super-admin/analytics/revenue
 */
const getRevenueStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Get successful payments
    const payments = await SubscriptionHistory.find({ action: 'payment_succeeded' });

    // Calculate MTD (Month to Date)
    const mtd = payments
      .filter(p => new Date(p.createdAt) >= startOfMonth)
      .reduce((sum, p) => sum + (p.amount || 0), 0) / 100;

    // Last Month
    const lastMonth = payments
      .filter(p => new Date(p.createdAt) >= startOfLastMonth && new Date(p.createdAt) <= endOfLastMonth)
      .reduce((sum, p) => sum + (p.amount || 0), 0) / 100;

    // QTD (Quarter to Date)
    const qtd = payments
      .filter(p => new Date(p.createdAt) >= startOfQuarter)
      .reduce((sum, p) => sum + (p.amount || 0), 0) / 100;

    // YTD (Year to Date)
    const ytd = payments
      .filter(p => new Date(p.createdAt) >= startOfYear)
      .reduce((sum, p) => sum + (p.amount || 0), 0) / 100;

    // All Time
    const allTime = payments.reduce((sum, p) => sum + (p.amount || 0), 0) / 100;

    // Monthly trend (last 12 months)
    const monthlyTrend = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthRevenue = payments
        .filter(p => {
          const date = new Date(p.createdAt);
          return date >= monthStart && date <= monthEnd;
        })
        .reduce((sum, p) => sum + (p.amount || 0), 0) / 100;

      monthlyTrend.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthRevenue
      });
    }

    res.json({
      mtd,
      lastMonth,
      qtd,
      ytd,
      allTime,
      monthlyTrend
    });
  } catch (error) {
    console.error('Get revenue stats error:', error);
    res.status(500).json({ message: 'Server error fetching revenue stats.', error: error.message || 'Unknown error' });
  }
};

/**
 * Get subscription statistics
 * GET /api/super-admin/analytics/subscriptions
 */
const getSubscriptionStats = async (req, res) => {
  try {
    const restaurants = await Restaurant.find({});

    const stats = {
      total: restaurants.length,
      active: restaurants.filter(r => r.subscriptionStatus === 'active').length,
      trialing: restaurants.filter(r => r.subscriptionStatus === 'trialing').length,
      pastDue: restaurants.filter(r => r.subscriptionStatus === 'past_due').length,
      canceled: restaurants.filter(r => r.subscriptionStatus === 'canceled').length,
      legacyFree: restaurants.filter(r => r.subscriptionPlan === 'legacy-free').length,
      small: restaurants.filter(r => r.subscriptionPlan === 'small').length,
      large: restaurants.filter(r => r.subscriptionPlan === 'large').length,
      byCountry: {
        US: restaurants.filter(r => r.country === 'US').length,
        CA: restaurants.filter(r => r.country === 'CA').length,
        unknown: restaurants.filter(r => !r.country).length
      }
    };

    // Churn rate (canceled this month vs total active start of month)
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const canceledThisMonth = await SubscriptionHistory.countDocuments({
      action: 'canceled',
      createdAt: { $gte: startOfMonth }
    });

    stats.churnThisMonth = canceledThisMonth;

    res.json(stats);
  } catch (error) {
    console.error('Get subscription stats error:', error);
    res.status(500).json({ message: 'Server error fetching subscription stats.', error: error.message || 'Unknown error' });
  }
};

/**
 * Get recent payments
 * GET /api/super-admin/analytics/payments?limit=50
 */
const getRecentPayments = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const payments = await SubscriptionHistory.find({
      action: { $in: ['payment_succeeded', 'payment_failed'] }
    })
      .populate('restaurantId', 'name email country')
      .sort({ createdAt: -1 })
      .limit(limit);

    const formatted = payments.map(p => ({
      id: p._id,
      restaurantName: p.restaurantId?.name || 'Unknown',
      restaurantEmail: p.restaurantId?.email,
      country: p.restaurantId?.country,
      action: p.action,
      amount: p.amount ? (p.amount / 100).toFixed(2) : '0.00',
      currency: p.currency,
      invoiceId: p.stripeInvoiceId,
      date: p.createdAt
    }));

    res.json({ payments: formatted });
  } catch (error) {
    console.error('Get recent payments error:', error);
    res.status(500).json({ message: 'Server error fetching payments.', error: error.message || 'Unknown error' });
  }
};

/**
 * Get revenue breakdown by plan/country/state
 * GET /api/super-admin/analytics/breakdown
 */
const getRevenueBreakdown = async (req, res) => {
  try {
    const payments = await SubscriptionHistory.find({
      action: 'payment_succeeded'
    }).populate('restaurantId', 'subscriptionPlan country state');

    // By Plan
    const byPlan = {
      small: 0,
      large: 0
    };

    // By Country
    const byCountry = {
      US: 0,
      CA: 0
    };

    // By State
    const byState = {};

    payments.forEach(p => {
      const amount = (p.amount || 0) / 100;
      const restaurant = p.restaurantId;

      if (restaurant) {
        // By plan
        if (restaurant.subscriptionPlan === 'small') byPlan.small += amount;
        if (restaurant.subscriptionPlan === 'large') byPlan.large += amount;

        // By country
        if (restaurant.country === 'US') byCountry.US += amount;
        if (restaurant.country === 'CA') byCountry.CA += amount;

        // By state
        if (restaurant.state) {
          byState[restaurant.state] = (byState[restaurant.state] || 0) + amount;
        }
      }
    });

    // Convert byState to sorted array
    const stateBreakdown = Object.entries(byState)
      .map(([state, revenue]) => ({ state, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10); // Top 10 states

    res.json({
      byPlan,
      byCountry,
      byState: stateBreakdown
    });
  } catch (error) {
    console.error('Get revenue breakdown error:', error);
    res.status(500).json({ message: 'Server error fetching breakdown.', error: error.message || 'Unknown error' });
  }
};

/**
 * Export analytics as CSV
 * GET /api/super-admin/analytics/export?type=revenue|payments|subscriptions
 */
const exportAnalytics = async (req, res) => {
  try {
    const type = req.query.type;

    if (type === 'payments') {
      const payments = await SubscriptionHistory.find({
        action: { $in: ['payment_succeeded', 'payment_failed'] }
      })
        .populate('restaurantId', 'name email country')
        .sort({ createdAt: -1 });

      const csv = [
        'Date,Restaurant,Email,Country,Action,Amount,Currency,Invoice ID',
        ...payments.map(p => {
          const restaurant = p.restaurantId;
          return [
            new Date(p.createdAt).toISOString(),
            restaurant?.name || '',
            restaurant?.email || '',
            restaurant?.country || '',
            p.action,
            p.amount ? (p.amount / 100).toFixed(2) : '0.00',
            p.currency,
            p.stripeInvoiceId || ''
          ].join(',');
        })
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=payments_export.csv');
      res.send(csv);

    } else if (type === 'subscriptions') {
      const restaurants = await Restaurant.find({});

      const csv = [
        'Restaurant,Email,Country,State,Plan,Status,Seat Capacity,Signup Source,Created At',
        ...restaurants.map(r => [
          r.name,
          r.email,
          r.country || '',
          r.state || '',
          r.subscriptionPlan,
          r.subscriptionStatus,
          r.seatCapacity || '',
          r.signupSource,
          new Date(r.createdAt).toISOString()
        ].join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=subscriptions_export.csv');
      res.send(csv);

    } else {
      res.status(400).json({ message: 'Invalid export type' });
    }
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({ message: 'Server error exporting data.', error: error.message || 'Unknown error' });
  }
};

module.exports = {
  getRevenueStats,
  getSubscriptionStats,
  getRecentPayments,
  getRevenueBreakdown,
  exportAnalytics
};
