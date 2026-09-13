'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Settings, ListRestart as Restaurant, MessageSquare, Clock, Save, Plus, Trash2, Loader2, Lock, ArrowUp } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient, RestaurantSettings, Table } from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';

interface TableConfig {
  id?: string;
  _id?: string;
  tableNumber: string;
  capacity: number;
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { restaurantData } = useAuthStore();
  const restaurantId = restaurantData?.id || restaurantData?._id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [tableConfig, setTableConfig] = useState<TableConfig[]>([]);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch settings from backend
  useEffect(() => {
    const fetchSettings = async () => {
      if (!restaurantId) return;
      
      try {
        const result = await apiClient.getSettings(restaurantId);
        if (result.data) {
          setSettings(result.data.settings);
          setTableConfig(result.data.tables.map(t => ({
            id: t._id,
            _id: t._id,
            tableNumber: t.tableNumber,
            capacity: t.capacity
          })));
        }
      } catch (error) {
        toast.error(t('failedToLoadSettings'));
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [restaurantId]);

  const handleSave = async () => {
    if (!restaurantId || !settings) return;
    
    setSaving(true);
    try {
      // Save settings
      const settingsResult = await apiClient.updateSettings(restaurantId, {
        gracePeriodMinutes: settings.gracePeriodMinutes,
        reminderDelayMinutes: settings.reminderDelayMinutes,
        allowedPartySizes: settings.allowedPartySizes,
        smsTemplates: settings.smsTemplates
      });

      if (settingsResult.error) {
        toast.error(settingsResult.error.message);
        return;
      }

      // Save tables
      const tablesResult = await apiClient.updateTables(restaurantId, tableConfig.map(t => ({
        id: t.id || t._id,
        tableNumber: t.tableNumber,
        capacity: t.capacity
      })));

      if (tablesResult.error) {
        toast.error(tablesResult.error.message);
        return;
      }

      toast.success(t('settingsSavedSuccess'));
    } catch (error) {
      toast.error(t('failedToSaveSettings'));
    } finally {
      setSaving(false);
    }
  };

  const addTable = () => {
    const nextNumber = tableConfig.length > 0 
      ? Math.max(...tableConfig.map(t => parseInt(t.tableNumber.replace('T', '')) || 0)) + 1 
      : 1;
    const newTable: TableConfig = {
      tableNumber: `T${nextNumber}`,
      capacity: 0, // Empty - user must fill in
    };
    setTableConfig([...tableConfig, newTable]);
  };

  const removeTable = (index: number) => {
    setTableConfig(tableConfig.filter((_, i) => i !== index));
  };

  const updateTable = (index: number, field: keyof TableConfig, value: string | number) => {
    setTableConfig(tableConfig.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">{t('failedToLoadSettings')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-ink">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold mb-2">{t('restaurantSettings')}</h1>
        <p className="text-muted">
          {t('manageConfiguration')}
        </p>
      </div>

      {/* Restaurant Profile - Read Only */}
      <Card className="bg-panel border border-border shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Restaurant className="h-5 w-5 mr-2 text-primary" />
            {t('restaurantProfile')}
            <Lock className="h-4 w-4 ml-2 text-muted" />
          </CardTitle>
          <CardDescription className="text-muted">
            {t('contactSuperAdmin')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name" className="text-ink">{t('restaurantName')}</Label>
              <Input
                id="name"
                value={settings.name}
                disabled
                className="mt-2 border-border bg-off cursor-not-allowed"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-ink">{t('phoneNumber')}</Label>
              <Input
                id="phone"
                value={settings.phone}
                disabled
                className="mt-2 border-border bg-off cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address" className="text-ink">{t('address')}</Label>
            <Input
              id="address"
              value={settings.address || settings.city}
              disabled
              className="mt-2 border-border bg-off cursor-not-allowed"
            />
          </div>
        </CardContent>
      </Card>

      {/* Waitlist Settings */}
      {/* <Card className="bg-panel border border-border shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-primary" />
            Waitlist Configuration
          </CardTitle>
          <CardDescription className="text-muted">
            Configure timing settings for your waitlist
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="gracePeriod" className="text-ink">Grace Period (minutes)</Label>
              <Input
                id="gracePeriod"
                type="number"
                min={5}
                max={60}
                value={settings.gracePeriodMinutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    gracePeriodMinutes: parseInt(e.target.value || '15'),
                  })
                }
                className="mt-2 border-border focus-visible:ring-2 focus-visible:ring-primary"
              />
              <p className="text-sm text-muted mt-1">
                Time customers have to arrive after being notified
              </p>
            </div>

            <div>
              <Label htmlFor="reminderDelay" className="text-ink">Reminder Delay (minutes)</Label>
              <Input
                id="reminderDelay"
                type="number"
                min={3}
                max={30}
                value={settings.reminderDelayMinutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    reminderDelayMinutes: parseInt(e.target.value || '7'),
                  })
                }
                className="mt-2 border-border focus-visible:ring-2 focus-visible:ring-primary"
              />
              <p className="text-sm text-muted mt-1">
                How long to wait before sending reminder if no response
              </p>
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* SMS Templates */}
      {/* <Card className="bg-panel border border-border shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2 text-primary" />
            SMS Templates
          </CardTitle>
          <CardDescription className="text-muted">
            Customize your automated messages. Use {'{name}'}, {'{partySize}'}, {'{restaurant}'}, {'{gracePeriod}'}, {'{waitTime}'} as variables
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="confirmation" className="text-ink">Booking Confirmation</Label>
            <Textarea
              id="confirmation"
              value={settings.smsTemplates?.confirmation || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  smsTemplates: {
                    ...settings.smsTemplates,
                    confirmation: e.target.value,
                  },
                })
              }
              rows={3}
              className="mt-2 border-border focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div>
            <Label htmlFor="tableReady" className="text-ink">Table Ready Notification</Label>
            <Textarea
              id="tableReady"
              value={settings.smsTemplates?.tableReady || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  smsTemplates: {
                    ...settings.smsTemplates,
                    tableReady: e.target.value,
                  },
                })
              }
              rows={3}
              className="mt-2 border-border focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div>
            <Label htmlFor="reminder" className="text-ink">Reminder Message</Label>
            <Textarea
              id="reminder"
              value={settings.smsTemplates?.reminder || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  smsTemplates: {
                    ...settings.smsTemplates,
                    reminder: e.target.value,
                  },
                })
              }
              rows={3}
              className="mt-2 border-border focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div>
            <Label htmlFor="cancelled" className="text-ink">Cancellation Message</Label>
            <Textarea
              id="cancelled"
              value={settings.smsTemplates?.cancelled || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  smsTemplates: {
                    ...settings.smsTemplates,
                    cancelled: e.target.value,
                  },
                })
              }
              rows={3}
              className="mt-2 border-border focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
        </CardContent>
      </Card> */}

      {/* Table Configuration */}
      <Card className="bg-panel border border-border shadow-soft">
        <CardHeader className="sticky top-0 z-20 bg-panel/95 backdrop-blur-sm border-b border-border/50 shadow-sm rounded-t-xl">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Restaurant className="h-5 w-5 mr-2 text-primary" />
              {t('tableConfiguration')}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={addTable} 
                size="sm" 
                className="bg-primary hover:bg-primary-600 text-white"
                disabled={
                  settings.subscriptionPlan === 'small' && 
                  tableConfig.reduce((acc, t) => acc + (t.capacity || 0), 0) >= 50
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('addTable')}
              </Button>
              <Button
                onClick={handleSave}
                size="sm"
                className="bg-primary hover:bg-primary-600 text-white"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {t('saveChanges')}
              </Button>
            </div>
          </CardTitle>
          <CardDescription className="text-muted">
            {t('manageIndividualTables')}
          </CardDescription>

          {/* Seat Capacity Monitor */}
          {settings.subscriptionPlan === 'small' && (
            <div className="mt-4 p-4 bg-off rounded-lg border border-border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">{t('planUsageSmallLimit')}</span>
                <span className={`text-sm font-bold ${
                  tableConfig.reduce((acc, t) => acc + (t.capacity || 0), 0) > 50 
                    ? 'text-red-500' 
                    : 'text-primary'
                }`}>
                  {tableConfig.reduce((acc, t) => acc + (t.capacity || 0), 0)} / 50 {t('seatsLabel')}
                </span>
              </div>
              <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    tableConfig.reduce((acc, t) => acc + (t.capacity || 0), 0) > 50 
                      ? 'bg-red-500' 
                      : 'bg-primary'
                  }`}
                  style={{ 
                    width: `${Math.min((tableConfig.reduce((acc, t) => acc + (t.capacity || 0), 0) / 50) * 100, 100)}%` 
                  }}
                />
              </div>
              {tableConfig.reduce((acc, t) => acc + (t.capacity || 0), 0) >= 40 && (
                <p className="text-xs text-muted mt-2">
                  {t('needMoreSeats')} <a href="/admin/subscription" className="text-primary hover:underline font-medium">{t('upgradeToLargeUnlimited')}</a>
                </p>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4 pt-4 pb-2">
            {tableConfig.length === 0 ? (
              <div className="text-center py-8 text-muted">
                {t('noTablesConfigured')}
              </div>
            ) : (
              tableConfig.map((table, index) => {
                const isFirst = index === 0;
                const isLast = index === tableConfig.length - 1;
                return (
                  <div
                    key={table.id || table._id || index}
                    className={`flex items-start gap-4 p-4 border rounded-lg bg-off transition-colors ${
                      isFirst ? 'border-primary/40 ring-1 ring-primary/20' :
                      isLast  ? 'border-border/60 border-dashed' :
                      'border-border'
                    }`}
                  >
                    <div className="flex-1">
                      {(isFirst || isLast) && (
                        <div className="mb-2">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            isFirst
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted/30 text-muted'
                          }`}>
                            {isFirst ? '↑ First Table' : '↓ Last Table'}
                          </span>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-ink">{t('tableNumber')}</Label>
                          <Input
                            value={table.tableNumber}
                            onChange={(e) => updateTable(index, 'tableNumber', e.target.value)}
                            placeholder="T1, T2, etc."
                            className="mt-2 border-border focus-visible:ring-2 focus-visible:ring-primary"
                          />
                        </div>
                        <div>
                          <Label className="text-ink">{t('capacity')}</Label>
                          <Input
                            type="number"
                            min={1}
                            max={20}
                            value={table.capacity === 0 ? '' : table.capacity}
                            onChange={(e) => updateTable(index, 'capacity', parseInt(e.target.value) || 0)}
                            placeholder="Enter capacity"
                            className="mt-2 border-border focus-visible:ring-2 focus-visible:ring-primary"
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeTable(index)}
                      disabled={tableConfig.length <= 1}
                      className="mt-6"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {showBackToTop && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 rounded-full shadow-lg bg-panel hover:bg-off text-primary border-primary border"
        >
          <ArrowUp className="h-4 w-4 mr-2" />
          Back to top
        </Button>
      )}
    </div>
  );
}
