'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient, Booking, DashboardStats, Table } from '@/lib/api-client';
import { useSSE } from '@/hooks/useSSE';
import { useTranslation } from '@/lib/i18n';
import { Clock, Users, MessageCircle, CheckCircle, X, Phone, Loader2, Wifi, WifiOff, Table as TableIcon, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';

export default function AdminDashboard() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const { isAuthenticated, userRole, isLoading: authLoading, restaurantData } = useAuthStore();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [updatingTableId, setUpdatingTableId] = useState<string | null>(null);
  
  // Table selection modal state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [showTableModal, setShowTableModal] = useState(false);
  


  const restaurantId = restaurantData?.id || restaurantData?._id;

  // Custom party popup state
  const [showCustomPartyPopup, setShowCustomPartyPopup] = useState(false);
  const [customPartyBooking, setCustomPartyBooking] = useState<Booking | null>(null);

  // Fetch data from backend
  const fetchData = useCallback(async () => {
    if (!restaurantId) return;
    
    try {
      const [statsRes, bookingsRes, settingsRes] = await Promise.all([
        apiClient.getDashboardStats(restaurantId),
        apiClient.getBookings(restaurantId, 'waiting,notified,confirmed,seated'),
        apiClient.getSettings(restaurantId)
      ]);

      if (statsRes.data) {
        setStats(statsRes.data);
      }
      if (bookingsRes.data) {
        setBookings(bookingsRes.data.bookings);
      }
      if (settingsRes.data?.tables) {
        setTables(settingsRes.data.tables);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  // SSE handlers for real-time updates
  const handleNewBooking = useCallback((data: any) => {
    const booking = data.booking;
    
    // Check if it's a custom party booking
    if (booking?.isCustomParty) {
      setCustomPartyBooking(booking);
      setShowCustomPartyPopup(true);
      toast.warning('🚨 Custom Party Alert!', {
        description: `${booking.customerName} - Party of ${booking.partySize} needs assistance`,
        duration: 10000
      });
    } else {
      toast.success(t('newBookingReceived'), {
        description: `${booking?.customerName} - ${t('partyOf')} ${booking?.partySize}`
      });
    }
    fetchData(); // Refresh data
  }, [fetchData]);

  const handleStatusChange = useCallback(() => {
    fetchData(); // Refresh data on any status change
  }, [fetchData]);

  // Connect to SSE for real-time updates
  const { isConnected, isAudioReady, testSound } = useSSE({
    restaurantId: restaurantId || '',
    onNewBooking: handleNewBooking,
    onStatusChange: handleStatusChange,
    playSound: true
  });

  // Initial data load
  useEffect(() => {
    if (!authLoading && isAuthenticated && restaurantId) {
      fetchData();
      // Also poll every 30 seconds as backup
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [authLoading, isAuthenticated, restaurantId, fetchData]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.replace('/auth');
      } else if (userRole !== 'admin') {
        router.replace('/kiosk');
      }
    }
  }, [isAuthenticated, userRole, authLoading, router]);

  // Action handlers
  const handleNotify = async (booking: Booking) => {
    const bookingId = booking._id || booking.id;
    setActionLoading(bookingId);
    try {
      const result = await apiClient.notifyCustomer(bookingId);
      if (result.error) {
        toast.error(result.error.message);
      } else {
        toast.success(t('customerNotified'));
        fetchData();
      }
    } catch (error) {
      toast.error(t('failedToNotify'));
    } finally {
      setActionLoading(null);
    }
  };

  // Open table selection modal
  const openTableSelector = (booking: Booking) => {
    setSelectedBooking(booking);
    setSelectedTableId('');
    setShowTableModal(true);
  };

  // Get available tables that exactly match the party size
  const getAvailableTables = (partySize: number) => {
    return tables.filter(t => 
      t.status === 'available' && 
      t.isActive && 
      t.capacity === partySize
    );
  };

  // Handle mark seated with selected table
  const handleMarkSeated = async () => {
    if (!selectedBooking || !selectedTableId) {
      toast.error(t('pleaseSelectTable'));
      return;
    }
    
    const bookingId = selectedBooking._id || selectedBooking.id;
    setActionLoading(bookingId);
    
    try {
      const result = await apiClient.markSeated(bookingId, selectedTableId);
      if (result.error) {
        toast.error(result.error.message);
      } else {
        toast.success(t('customerSeated'));
        setShowTableModal(false);
        setSelectedBooking(null);
        setSelectedTableId('');
        
        // Refresh data immediately, animation handled by AnimatePresence
        setSelectedBooking(null);
        setSelectedTableId('');
        fetchData();
      }
    } catch (error) {
      toast.error(t('failedToSeat'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (booking: Booking) => {
    const bookingId = booking._id || booking.id;
    setActionLoading(bookingId);
    try {
      const result = await apiClient.cancelBooking(bookingId);
      if (result.error) {
        toast.error(result.error.message);
      } else {
        toast.success(t('bookingCancelled'));
        fetchData();
      }
    } catch (error) {
      toast.error(t('failedToCancel'));
    } finally {
      setActionLoading(null);
    }
  };

  // Handle table status update (cleaning -> available)
  const handleUpdateTableStatus = async (tableId: string, status: 'available' | 'cleaning' | 'occupied') => {
    setUpdatingTableId(tableId);
    try {
      const result = await apiClient.updateTableStatus(tableId, status);
      if (result.data) {
        toast.success(result.data.message);
        fetchData(); // Refresh all data
      } else if (result.error) {
        toast.error(result.error.message);
      }
    } catch (error) {
      toast.error('Failed to update table status');
    } finally {
      setUpdatingTableId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-off text-ink ring-1 ring-border';
      case 'notified':
        return 'bg-info/10 text-info border-0';
      case 'confirmed':
        return 'bg-primary/10 text-primary border-0';
      case 'seated':
        return 'bg-success/10 text-success border-0';
      case 'cancelled':
        return 'bg-error/10 text-error border-0';
      default:
        return 'bg-ink/10 text-ink border-0';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting':
        return t('inQueue') || 'In Queue';
      case 'notified':
        return t('tableReady') || 'Table Ready';
      case 'confirmed':
        return 'Confirmed';
      case 'seated':
        return t('seated') || 'Seated';
      case 'cancelled':
        return t('cancelled') || 'Cancelled';
      default:
        return status;
    }
  };

  // Loading state
  if (authLoading || !isAuthenticated || userRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Filter out seated customers and sort by creation time (earliest first)
  const activeBookings = bookings
    .filter(b => ['waiting', 'notified', 'confirmed'].includes(b.status))
    .sort((a, b) => {
      const dateA = new Date(a.checkInTime || a.createdAt).getTime();
      const dateB = new Date(b.checkInTime || b.createdAt).getTime();
      return dateA - dateB; // Ascending: earliest first
    });

  return (
    <div className="space-y-8 text-ink">
      {/* Custom Party Popup Modal */}
      {showCustomPartyPopup && customPartyBooking && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] animate-in fade-in duration-200">
          <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-amber-800 mb-2">
                🚨 {t('customPartyAlert')}
              </h3>
              <p className="text-amber-700 mb-6">
                {t('largePartyNeedsAssistance')}
              </p>
              
              <div className="bg-white rounded-xl p-4 mb-6 text-left space-y-3">
                <div className="flex justify-between">
                  <span className="text-amber-700 font-medium">{t('customer')}:</span>
                  <span className="font-bold text-amber-900">{customPartyBooking.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700 font-medium">{t('partySizeLabel')}:</span>
                  <span className="font-bold text-amber-900">{customPartyBooking.partySize} {t('people')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700 font-medium">{t('phone')}</span>
                  <span className="font-bold text-amber-900">{customPartyBooking.customerPhone}</span>
                </div>
              </div>
              
              <div className="bg-amber-100 rounded-lg p-3 mb-6">
                <p className="text-sm text-amber-800">
                  <strong>{t('actionRequired')}:</strong> {t('sendStaffToAssist')}
                </p>
              </div>
              
              <Button 
                className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-lg"
                onClick={() => {
                  setShowCustomPartyPopup(false);
                  setCustomPartyBooking(null);
                }}
              >
                {t('gotItWillAssist')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table Selection Modal */}
      {showTableModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-panel border border-border rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold mb-2">{t('selectTable')}</h3>
            <p className="text-muted mb-4">
              {t('assignTableFor')} <span className="font-medium text-ink">{selectedBooking.customerName}</span> ({t('partyOf')} {selectedBooking.partySize})
            </p>
            
            {(() => {
              const availableTables = getAvailableTables(selectedBooking.partySize);
              
              if (availableTables.length === 0) {
                return (
                  <div className="text-center py-6">
                    <TableIcon className="h-12 w-12 text-muted mx-auto mb-3" />
                    <p className="text-muted">{t('noAvailableTablesForParty')} {selectedBooking.partySize}</p>
                    <p className="text-sm text-muted mt-1">{t('pleaseWaitForTable')}</p>
                  </div>
                );
              }
              
              return (
                <div className="space-y-3">
                  <label className="text-sm font-medium">{t('availableTablesCapacity')} {selectedBooking.partySize})</label>
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="w-full h-12 px-4 rounded-lg border border-border bg-panel text-ink focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">{t('selectATable')}</option>
                    {availableTables.map(table => (
                      <option key={table._id} value={table._id}>
                        {t('table')} {table.tableNumber} ({t('seats')} {table.capacity})
                      </option>
                    ))}
                  </select>
                </div>
              );
            })()}
            
            <div className="flex gap-3 mt-6">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setShowTableModal(false);
                  setSelectedBooking(null);
                  setSelectedTableId('');
                }}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-success hover:bg-success/90 text-white"
                onClick={handleMarkSeated}
                disabled={!selectedTableId || actionLoading === (selectedBooking._id || selectedBooking.id)}
              >
                {actionLoading === (selectedBooking._id || selectedBooking.id) ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                {t('confirmSeating')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-success" />
              <span className="text-success">{t('liveUpdatesActive')}</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-muted" />
              <span className="text-muted">{t('connecting')}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isAudioReady ? (
            <button 
              onClick={testSound}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              title="Click to test notification sound"
            >
              <Volume2 className="h-4 w-4 text-success" />
              <span className="text-success">{t('soundOn')}</span>
            </button>
          ) : (
            <>
              <VolumeX className="h-4 w-4 text-amber-500" />
              <span className="text-amber-500 cursor-pointer" title={t('clickToEnableSound')}>{t('clickToEnableSound')}</span>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-panel border border-border shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalWaiting') || 'Total Waiting'}</CardTitle>
            <Users className="h-4 w-4 text-ink/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.totalWaiting || 0}
            </div>
            <p className="text-xs text-muted">{t('activeInQueue') || 'Active in queue'}</p>
          </CardContent>
        </Card>

        <Card className="bg-panel border border-border shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('availableTables') || 'Available Tables'}</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.availableTables || 0}
            </div>
            <p className="text-xs text-muted">{t('readyToSeat') || 'Ready to seat'}</p>
          </CardContent>
        </Card>

        <Card className="bg-panel border border-border shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('todaysSeated') || "Today's Seated"}</CardTitle>
            <Users className="h-4 w-4 text-ink/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.todaysSeated || 0}
            </div>
            <p className="text-xs text-muted">{t('totalCustomers') || 'Total customers'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Waitlist Management */}
      <Card className="bg-panel border border-border shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-primary" />
            {t('activeWaitlist') || 'Active Waitlist'}
          </CardTitle>
          <CardDescription className="text-muted">
            {t('manageCustomerQueue') || 'Manage customer queue and seating'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : activeBookings.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('noCustomersWaiting') || 'No customers waiting'}</h3>
              <p className="text-muted">{t('customersWillAppear') || 'Customers will appear here when they join'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {activeBookings.map((booking, index) => {
                  const bookingId = booking._id || booking.id;
                  const isActionLoading = actionLoading === bookingId;

                  return (
                    <motion.div
                      key={bookingId}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ 
                        opacity: 0, 
                        scale: 0.9, 
                        backgroundColor: '#fee2e2', // red-100
                        x: -100,
                        height: 0, 
                        marginBottom: 0, 
                        overflow: 'hidden' 
                      }}
                      transition={{ 
                        duration: 0.5, // Slower duration
                        type: "spring",
                        stiffness: 100,
                        damping: 15
                      }}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-off bg-panel"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">{index + 1}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{booking.customerName}</h3>
                            {booking.isCustomParty && (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                                {t('customParty')}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
                            <span className="flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              {t('partyOf')} {booking.partySize}
                            </span>
                            <span className="flex items-center">
                              <Phone className="h-4 w-4 mr-1" />
                              {booking.customerPhone}
                            </span>
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {formatDistanceToNow(new Date(booking.checkInTime || booking.createdAt), { addSuffix: true, locale: language === 'fr' ? fr : undefined })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge className={`${getStatusColor(booking.status)} rounded-md`}>
                          {getStatusText(booking.status)}
                        </Badge>

                        {booking.status === 'waiting' && (
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary-600 text-white"
                            onClick={() => handleNotify(booking)}
                            disabled={isActionLoading}
                          >
                            {isActionLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <MessageCircle className="h-4 w-4 mr-1" />
                                {t('notify') || 'Table Ready'}
                              </>
                            )}
                          </Button>
                        )}

                        {['notified', 'confirmed'].includes(booking.status) && (
                          <Button
                            size="sm"
                            onClick={() => openTableSelector(booking)}
                            className="bg-success hover:bg-success/90 text-white"
                            disabled={isActionLoading}
                          >
                            {isActionLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                {t('markSeated') || 'Mark Seated'}
                              </>
                            )}
                          </Button>
                        )}

                        {['waiting', 'notified', 'confirmed'].includes(booking.status) && (
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => handleCancel(booking)}
                            disabled={isActionLoading}
                          >
                            {isActionLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <X className="h-4 w-4 mr-1" />
                                {t('cancel') || 'Cancel'}
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Occupied Tables Section */}
      {tables.filter(t => t.status === 'occupied' || t.status === 'cleaning').length > 0 && (
        <Card className="bg-panel border border-border shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TableIcon className="h-5 w-5" />
                  {t('occupiedTables') || 'Occupied Tables'}
                </CardTitle>
                <CardDescription className="text-muted">
                  {t('manageTableTurnover') || 'Manage table turnover from here'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge className="bg-orange-500/10 text-orange-600 border border-orange-500/30">
                  <Users className="h-3 w-3 mr-1" />
                  {tables.filter(t => t.status === 'occupied').length} {t('occupied') || 'Occupied'}
                </Badge>
                <Badge className="bg-purple-500/10 text-purple-600 border border-purple-500/30">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {tables.filter(t => t.status === 'cleaning').length} {t('cleaning') || 'Cleaning'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Occupied Tables */}
              {tables.filter(t => t.status === 'occupied').map(table => {
                // Find the booking for this table
                const tableBooking = bookings.find(b => 
                  b.tableId === table._id && b.status === 'seated'
                );
                
                return (
                  <div
                    key={table._id}
                    className="flex items-center justify-between p-4 border border-orange-500/30 rounded-lg bg-orange-500/5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center">
                        <TableIcon className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium">Table {table.tableNumber}</p>
                        <div className="flex items-center gap-2 text-sm text-muted">
                          <Users className="h-3 w-3" />
                          {tableBooking ? (
                            <span>{tableBooking.customerName} ({tableBooking.partySize})</span>
                          ) : (
                            <span>{t('capacity')}: {table.capacity}</span>
                          )}
                          {tableBooking?.seatedAt && (
                            <>
                              <span>•</span>
                              <Clock className="h-3 w-3" />
                              <span>{formatDistanceToNow(new Date(tableBooking.seatedAt), { addSuffix: false, locale: language === 'fr' ? fr : undefined })}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateTableStatus(table._id, 'cleaning')}
                      disabled={updatingTableId === table._id}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {updatingTableId === table._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-1" />
                          {t('markForCleaning') || 'Mark for Cleaning'}
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}

              {/* Cleaning Tables */}
              {tables.filter(t => t.status === 'cleaning').map(table => (
                <div
                  key={table._id}
                  className="flex items-center justify-between p-4 border border-purple-500/30 rounded-lg bg-purple-500/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-purple-500/10 rounded-full flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">Table {table.tableNumber}</p>
                      <div className="flex items-center gap-2 text-sm text-purple-600">
                        <Sparkles className="h-3 w-3" />
                        <span>{t('beingCleaned') || 'Being cleaned...'}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleUpdateTableStatus(table._id, 'available')}
                    disabled={updatingTableId === table._id}
                    className="bg-success hover:bg-success/90 text-white"
                  >
                    {updatingTableId === table._id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {t('markAvailable') || 'Mark Available'}
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
