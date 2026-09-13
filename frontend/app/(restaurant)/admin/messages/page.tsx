'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient, Conversation, Message } from '@/lib/api-client';
import { useSSE } from '@/hooks/useSSE';
import { useTranslation } from '@/lib/i18n';
import { MessageSquare, Send, Phone, Clock, Search, Loader2, Wifi, WifiOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function MessagesPage() {
  const { restaurantData } = useAuthStore();
  const { t } = useTranslation();
  const restaurantId = restaurantData?.id || restaurantData?._id;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch messages from backend
  const fetchMessages = useCallback(async () => {
    if (!restaurantId) return;
    
    try {
      const result = await apiClient.getMessages(restaurantId);
      if (result.data) {
        setConversations(result.data.conversations);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  // SSE handler for new messages
  const handleNewMessage = useCallback(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Connect to SSE for real-time updates
  const { isConnected } = useSSE({
    restaurantId: restaurantId || '',
    onNewMessage: handleNewMessage,
    playSound: false
  });

  // Initial load
  useEffect(() => {
    fetchMessages();
    // Poll every 30 seconds as backup
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const selectedConversation = conversations.find(c => c.customerPhone === selectedPhone);

  const filteredConversations = conversations.filter((conv) => {
    const q = searchTerm.toLowerCase();
    return (
      conv.customerName?.toLowerCase().includes(q) ||
      conv.customerPhone.includes(q) ||
      conv.messages.some(m => m.content.toLowerCase().includes(q))
    );
  });

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'confirmation':
        return 'bg-info/10 text-info';
      case 'tableReady':
        return 'bg-primary/10 text-primary';
      case 'reminder':
        return 'bg-secondary/10 text-secondary-600';
      case 'response':
        return 'bg-success/10 text-success';
      case 'cancelled':
        return 'bg-error/10 text-error';
      default:
        return 'bg-ink/10 text-ink';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 text-ink">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">{t('messageCenter')}</h1>
          <p className="text-muted">{t('viewSmsComms')}</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-success" />
            <span className="text-success">{t('live')}</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-muted" />
            <span className="text-muted">{t('connecting')}</span>
            </>
          )}
        </div>
      </div>

      {/* Search and Stats */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted" />
          <Input
            placeholder={t('searchMessagesPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-border focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div className="flex gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold">
              {conversations.reduce((sum, c) => sum + c.messages.filter(m => m.direction === 'outbound').length, 0)}
            </p>
            <p className="text-xs text-muted">{t('sentToday')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-success">
              {conversations.reduce((sum, c) => sum + c.messages.filter(m => m.direction === 'inbound').length, 0)}
            </p>
            <p className="text-xs text-muted">{t('responses')}</p>
          </div>
        </div>
      </div>

      {conversations.length === 0 ? (
        <Card className="bg-panel border border-border shadow-soft">
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('noMessagesYet')}</h3>
            <p className="text-muted">{t('smsConversationsWillAppear')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Conversation List */}
          <div className="lg:col-span-1">
            <Card className="bg-panel border border-border shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">{t('conversations')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                  {filteredConversations.map((conv) => {
                    const lastMessage = conv.lastMessage;
                    const isSelected = selectedPhone === conv.customerPhone;

                    return (
                      <div
                        key={conv.customerPhone}
                        className={`p-4 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary/5 border-l-4 border-l-primary'
                            : 'hover:bg-off'
                        }`}
                        onClick={() => setSelectedPhone(conv.customerPhone)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">{conv.customerName || t('unknown')}</h3>
                          <Badge className={`${getMessageTypeColor(lastMessage.messageType)} border-0`}>
                            {lastMessage.messageType}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted truncate mb-1">{lastMessage.content}</p>
                        <div className="flex items-center justify-between text-xs text-muted">
                          <span className="flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {conv.customerPhone}
                          </span>
                          <span>
                            {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Message Thread */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col bg-panel border border-border shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2 text-primary" />
                  {selectedConversation
                    ? `${t('conversationWith')} ${selectedConversation.customerName || selectedConversation.customerPhone}`
                    : t('selectConversation')}
                </CardTitle>
                {selectedConversation && (
                  <CardDescription className="text-muted">
                    {selectedConversation.customerPhone}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                {selectedConversation ? (
                  <div className="flex-1 overflow-y-auto space-y-4">
                    {selectedConversation.messages.map((message) => (
                      <div
                        key={message._id}
                        className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.direction === 'outbound'
                              ? 'bg-primary text-white'
                              : 'bg-off ring-1 ring-border text-ink'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <div className="flex items-center justify-between mt-2">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                message.direction === 'outbound'
                                  ? 'border-white/30 text-white/90'
                                  : 'border-border text-muted'
                              }`}
                            >
                              {message.messageType}
                            </Badge>
                            <span
                              className={`text-xs ${
                                message.direction === 'outbound' ? 'text-white/70' : 'text-muted'
                              }`}
                            >
                              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 text-muted mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">{t('noConversationSelected')}</h3>
                      <p className="text-muted">{t('selectCustomerToView')}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
