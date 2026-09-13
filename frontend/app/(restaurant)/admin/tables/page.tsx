'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient, Table } from '@/lib/api-client';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import {
  Table as TableIcon,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Utensils,
  Loader2,
  RefreshCw,
  Sparkles,
  Ban, 
  Footprints,
} from 'lucide-react';

export default function TablesPage() {
  const { restaurantData } = useAuthStore();
  const { t } = useTranslation();
  const restaurantId = restaurantData?.id || restaurantData?._id;

  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingTableId, setUpdatingTableId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Fetch tables from backend
  const fetchTables = useCallback(async () => {
    if (!restaurantId) return;
    
    try {
      const result = await apiClient.getSettings(restaurantId);
      if (result.data?.tables) {
        setTables(result.data.tables);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
      toast.error(t('failedToLoadTables'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchTables();
    // Poll every 15 seconds for real-time updates
    const interval = setInterval(fetchTables, 15000);
    return () => clearInterval(interval);
  }, [fetchTables]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTables();
  };

  const handleUpdateStatus = async (tableId: string, status: 'available' | 'cleaning' | 'occupied' | 'unavailable' | 'reserved') => {
    setUpdatingTableId(tableId);
    try {
      const result = await apiClient.updateTableStatus(tableId, status);
      if (result.data) {
        toast.success(result.data.message);
        // Update local state
        setTables(prev => prev.map(t => 
          t._id === tableId ? { ...t, status } : t
        ));
      } else if (result.error) {
        toast.error(result.error.message);
      }
    } catch (error) {
      toast.error(t('failedToUpdateTableStatus'));
    } finally {
      setUpdatingTableId(null);
    }
  };

  const handleWalkIn = async (tableId: string, capacity: number) => {
    setUpdatingTableId(tableId);
    try {
      const result = await apiClient.createWalkIn(tableId, capacity);
      if (result.data) {
        toast.success(t('walkInSeatedSuccess') || 'Walk-in seated successfully');
        fetchTables(); // Refresh to get updated status and booking link
      } else if (result.error) {
        toast.error(result.error.message);
      }
    } catch (error) {
      toast.error(t('failedToSeatWalkIn') || 'Failed to seat walk-in');
    } finally {
      setUpdatingTableId(null);
    }
  };

  const getTableStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-success/10 text-success border border-success/30';
      case 'reserved':
        return 'bg-info/10 text-info border border-info/30';
      case 'occupied':
        return 'bg-orange-500/10 text-orange-600 border border-orange-500/30';
      case 'reserved':
        return 'bg-blue-500/10 text-blue-600 border border-blue-500/30';
      case 'cleaning':
        return 'bg-purple-500/10 text-purple-600 border border-purple-500/30';
      case 'unavailable':
        return 'bg-red-500/10 text-red-600 border border-red-500/30';
      default:
        return 'bg-ink/10 text-ink border border-ink/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4" />;
      case 'reserved':
        return <Clock className="h-4 w-4" />;
      case 'occupied':
        return <Users className="h-4 w-4" />;
      case 'cleaning':
        return <Sparkles className="h-4 w-4" />;
      case 'unavailable':
        return <Ban className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = {
    available: tables.filter(t => t.status === 'available').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    cleaning: tables.filter(t => t.status === 'cleaning').length,
    unavailable: tables.filter(t => t.status === 'unavailable').length,
  };

  const toggleFilter = (status: string) => {
    setFilterStatus(prev => prev === status ? 'all' : status);
  };

  const filteredTables = filterStatus === 'all' 
    ? tables 
    : tables.filter(t => t.status === filterStatus);

  return (
    <div className="space-y-8 text-ink">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">{t('tableManagement')}</h1>
          <p className="text-muted">{t('monitorSeatingCapacity')}</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={refreshing}
          className="border-border"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card 
          className={`bg-panel border shadow-soft cursor-pointer transition-colors hover:border-success/50 ${filterStatus === 'available' ? 'border-success ring-1 ring-success' : 'border-border'}`}
          onClick={() => toggleFilter('available')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <div>
                <p className="text-2xl font-bold">{stats.available}</p>
                <p className="text-xs text-muted">{t('available')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`bg-panel border shadow-soft cursor-pointer transition-colors hover:border-orange-500/50 ${filterStatus === 'occupied' ? 'border-orange-500 ring-1 ring-orange-500' : 'border-border'}`}
          onClick={() => toggleFilter('occupied')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{stats.occupied}</p>
                <p className="text-xs text-muted">{t('occupied')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`bg-panel border shadow-soft cursor-pointer transition-colors hover:border-purple-500/50 ${filterStatus === 'cleaning' ? 'border-purple-500 ring-1 ring-purple-500' : 'border-border'}`}
          onClick={() => toggleFilter('cleaning')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{stats.cleaning}</p>
                <p className="text-xs text-muted">{t('cleaning')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`bg-panel border shadow-soft cursor-pointer transition-colors hover:border-info/50 ${filterStatus === 'reserved' ? 'border-info ring-1 ring-info' : 'border-border'}`}
          onClick={() => toggleFilter('reserved')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-info" />
              <div>
                <p className="text-2xl font-bold">{stats.reserved}</p>
                <p className="text-xs text-muted">{t('reserved')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Unavailable Stats */}
         <Card 
           className={`bg-panel border shadow-soft cursor-pointer transition-colors hover:border-red-500/50 ${filterStatus === 'unavailable' ? 'border-red-500 ring-1 ring-red-500' : 'border-border'}`}
           onClick={() => toggleFilter('unavailable')}
         >
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{stats.unavailable}</p>
                <p className="text-xs text-muted">{t('unavailable') || 'Unavailable'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Grid */}
      {tables.length === 0 ? (
        <Card className="bg-panel border border-border shadow-soft">
          <CardContent className="py-12 text-center">
            <TableIcon className="h-12 w-12 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('noTablesConfiguredYet')}</h3>
            <p className="text-muted mb-4">{t('goToSettingsToAddTables')}</p>
            <Button 
              onClick={() => window.location.href = '/admin/settings'}
              className="bg-primary hover:bg-primary-600 text-white"
            >
              {t('configureTables')}
            </Button>
          </CardContent>
        </Card>
      ) : filteredTables.length === 0 ? (
        <Card className="bg-panel border border-border shadow-soft">
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-medium mb-2">{t('noTablesMatchFilter') || 'No tables match this filter'}</h3>
            <Button 
              onClick={() => setFilterStatus('all')}
              variant="outline"
              className="mt-4"
            >
              {t('clearFilter') || 'Clear Filter'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTables.filter(t => t.isActive).map((table) => (
            <Card key={table._id} className="overflow-hidden bg-panel border border-border shadow-soft">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TableIcon className="h-5 w-5 text-ink/70" />
                    <CardTitle className="text-lg">Table {table.tableNumber}</CardTitle>
                  </div>
                  <Badge className={`${getTableStatusColor(table.status)} rounded-md`}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(table.status)}
                      <span className="capitalize">{t(table.status as any) || table.status}</span>
                    </div>
                  </Badge>
                </div>
                <CardDescription className="text-muted">
                {t('seatsUpTo')} {table.capacity} {t('people')}
              </CardDescription>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-2">
                  {table.status === 'available' && (
                    <>
                      <div className="bg-success/10 rounded-lg p-3 text-center">
                        <CheckCircle className="h-6 w-6 text-success mx-auto mb-1" />
                        <p className="text-sm font-medium text-success">{t('readyForGuests')}</p>
                      </div>
                      <div className="flex flex-col gap-2 mt-2">
                        <Button
                          size="sm"
                          onClick={() => handleWalkIn(table._id, table.capacity)}
                          disabled={updatingTableId === table._id}
                          className="w-full bg-primary hover:bg-primary-600 text-white"
                        >
                           {updatingTableId === table._id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Footprints className="h-4 w-4 mr-1" />
                          )}
                          {t('seatWalkIn') || 'Walk-In'}
                        </Button>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(table._id, 'reserved')}
                            disabled={updatingTableId === table._id}
                            className="border-info text-info hover:bg-info/10 font-medium"
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            {t('reserve') || 'Reserve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(table._id, 'unavailable')}
                            disabled={updatingTableId === table._id}
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            {t('unavailable') || 'Unavailable'}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Occupied - Show Mark for Cleaning button */}
                  {table.status === 'occupied' && (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(table._id, 'cleaning')}
                      disabled={updatingTableId === table._id}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {updatingTableId === table._id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      {t('markForCleaning')}
                    </Button>
                  )}

                  {/* Cleaning - Show Mark Available button */}
                  {table.status === 'cleaning' && (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(table._id, 'available')}
                      disabled={updatingTableId === table._id}
                      className="w-full bg-success hover:bg-success/90 text-white"
                    >
                      {updatingTableId === table._id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      {t('markAvailable')}
                    </Button>
                  )}

                  {/* Reserved */}
                  {table.status === 'reserved' && (
                    <div className="space-y-2">
                       <div className="bg-info/10 rounded-lg p-3 text-center border border-info/20">
                         <Clock className="h-6 w-6 text-info mx-auto mb-1" />
                         <p className="text-sm font-medium text-info">{t('reserved')}</p>
                       </div>
                       <div className="grid grid-cols-2 gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(table._id, 'occupied')}
                            disabled={updatingTableId === table._id}
                            className="w-full bg-info hover:bg-info/90 text-white"
                          >
                            <Users className="h-4 w-4 mr-1" />
                            {t('markSeated') || 'Seat'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(table._id, 'available')}
                            disabled={updatingTableId === table._id}
                            className="w-full border-success text-success hover:bg-success/10 bg-success/5"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {t('markAvailable') || 'Available'}
                          </Button>
                       </div>
                    </div>
                  )}

                  {/* Unavailable */}
                  {table.status === 'unavailable' && (
                    <div className="space-y-2">
                      <div className="bg-red-500/10 rounded-lg p-3 text-center border border-red-500/20">
                        <Ban className="h-6 w-6 text-red-600 mx-auto mb-1" />
                        <p className="text-sm font-medium text-red-600">{t('tableUnavailable') || 'Table Unavailable'}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(table._id, 'available')}
                        disabled={updatingTableId === table._id}
                        className="w-full bg-success hover:bg-success/90 text-white"
                      >
                        {updatingTableId === table._id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        {t('markAvailable')}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
