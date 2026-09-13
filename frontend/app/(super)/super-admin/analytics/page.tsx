'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { getSuperAdminToken, redirectToSuperAdminLogin } from '@/lib/super-admin-auth';

interface RevenueStats {
  mtd: number;
  lastMonth: number;
  qtd: number;
  ytd: number;
  allTime: number;
  monthlyTrend: { month: string; revenue: number }[];
}

interface SubscriptionStats {
  total: number;
  active: number;
  trialing: number;
  pastDue: number;
  canceled: number;
  legacyFree: number;
  small: number;
  large: number;
  byCountry: { US: number; CA: number; unknown: number };
  churnThisMonth: number;
}

interface Payment {
  id: string;
  restaurantName: string;
  restaurantEmail: string;
  country: string;
  action: string;
  amount: string;
  currency: string;
  invoiceId: string;
  date: string;
}

export default function AnalyticsPage() {
  const [revenue, setRevenue] = useState<RevenueStats | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionStats | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const token = getSuperAdminToken();
      if (!token) {
        redirectToSuperAdminLogin();
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };

      const [revenueRes, subscriptionsRes, paymentsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/super-admin/analytics/revenue`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/super-admin/analytics/subscriptions`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/super-admin/analytics/payments?limit=20`, { headers })
      ]);

      if (revenueRes.status === 401 || subscriptionsRes.status === 401 || paymentsRes.status === 401) {
        redirectToSuperAdminLogin();
        return;
      }

      if (revenueRes.ok) setRevenue(await revenueRes.json());
      if (subscriptionsRes.ok) setSubscriptions(await subscriptionsRes.json());
      if (paymentsRes.ok) {
        const data = await paymentsRes.json();
        setPayments(data.payments);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleExport = async (type: 'payments' | 'subscriptions') => {
    try {
      const token = getSuperAdminToken();
      if (!token) {
        redirectToSuperAdminLogin();
        return;
      }
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/super-admin/analytics/export?type=${type}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.status === 401) {
        redirectToSuperAdminLogin();
        return;
      }

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        toast.success('Export downloaded');
      } else {
        toast.error('Export failed');
      }
    } catch (error) {
      toast.error('Export failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('payments')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Export Payments
          </button>
          <button
            onClick={() => handleExport('subscriptions')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Export Subscriptions
          </button>
        </div>
      </div>

      {/* Revenue Overview */}
      {revenue && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-1">MTD Revenue</p>
            <p className="text-2xl font-bold text-green-600">${revenue.mtd.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-1">Last Month</p>
            <p className="text-2xl font-bold">${revenue.lastMonth.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-1">QTD Revenue</p>
            <p className="text-2xl font-bold text-blue-600">${revenue.qtd.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-1">YTD Revenue</p>
            <p className="text-2xl font-bold text-purple-600">${revenue.ytd.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-1">All-Time</p>
            <p className="text-2xl font-bold text-indigo-600">${revenue.allTime.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Monthly Trend Chart */}
      {revenue && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Monthly Revenue Trend</h2>
          <div className="h-64 flex items-end justify-between gap-2">
            {revenue.monthlyTrend.map((item, idx) => {
              const maxRevenue = Math.max(...revenue.monthlyTrend.map(i => i.revenue));
              const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
              
              return (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-all relative group" style={{ height: `${height}%` }}>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                      ${item.revenue.toLocaleString()}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-2 transform -rotate-45 origin-top-left">{item.month}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subscription Stats */}
      {subscriptions && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Subscription Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Active:</span>
                <span className="font-semibold text-green-600">{subscriptions.active}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Trialing:</span>
                <span className="font-semibold text-blue-600">{subscriptions.trialing}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Past Due:</span>
                <span className="font-semibold text-red-600">{subscriptions.pastDue}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Canceled:</span>
                <span className="font-semibold text-gray-600">{subscriptions.canceled}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">By Plan</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Small:</span>
                <span className="font-semibold">{subscriptions.small}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Large:</span>
                <span className="font-semibold">{subscriptions.large}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Legacy Free:</span>
                <span className="font-semibold text-green-600">{subscriptions.legacyFree}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">By Country</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">🇺🇸 USA:</span>
                <span className="font-semibold">{subscriptions.byCountry.US}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">🇨🇦 Canada:</span>
                <span className="font-semibold">{subscriptions.byCountry.CA}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Unknown:</span>
                <span className="font-semibold text-gray-500">{subscriptions.byCountry.unknown}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Metrics</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-semibold">{subscriptions.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Churn (MTD):</span>
                <span className="font-semibold text-orange-600">{subscriptions.churnThisMonth}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Payments */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Payments</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Restaurant</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Country</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {new Date(payment.date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{payment.restaurantName}</p>
                      <p className="text-xs text-gray-500">{payment.restaurantEmail}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{payment.country}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      payment.action === 'payment_succeeded' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {payment.action === 'payment_succeeded' ? 'Success' : 'Failed'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold">
                    ${payment.amount} {payment.currency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 && (
            <p className="text-center text-gray-500 py-8">No payments yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
