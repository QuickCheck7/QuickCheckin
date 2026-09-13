'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch messages from backend
  const fetchMessages = useCallback(async () => {
    if (!restaurantId) return;
    
    try {
      const result = await apiClient.getMessages(restaurantId);
      if (result.data) {
        setConversations(result.data.conversations || []);
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

  // Automatically select first conversation if none selected
  useEffect(() => {
    if (conversations.length > 0) {
      if (!selectedPhone || !conversations.some(c => c.customerPhone === selectedPhone)) {
        setSelectedPhone(conversations[0].customerPhone);
      }
    }
  }, [conversations, selectedPhone]);

  const selectedConversation = conversations.find(c => c.customerPhone === selectedPhone);

  // Auto-scroll to bottom of conversation thread
  useEffect(() => {
    if (selectedConversation) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedConversation?.messages?.length, selectedPhone]);

  const filteredConversations = conversations.filter((conv) => {
    const q = searchTerm.toLowerCase();
    return (
      conv.customerName?.toLowerCase().includes(q) ||
      conv.customerPhone.includes(q) ||
      conv.messages.some(m => m.content?.toLowerCase().includes(q))
    );
  });

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'confirmation':
        return 'bg-info/10 text-info';
      case 'tableReady':
        return 'bg-primary/10 text-primary';
      case 'reminder':
      case 'followUp':
        return 'bg-secondary/10 text-secondary-600';
      case 'response':
        return 'bg-success/10 text-success';
      case 'cancelled':
      case 'cancelledByCustomer':
        return 'bg-error/10 text-error';
      case 'tableReleased':
      case 'autoCancel':
      case 'autoCancelled':
        return 'bg-amber-500/10 text-amber-600';
      default:
        return 'bg-ink/10 text-ink';
    }
  };

  const getMessageTypeLabel = (type: string, direction?: string) => {
    switch (type) {
      case 'confirmation':
        return 'Confirmation';
      case 'tableReady':
        return 'Table Ready';
      case 'reminder':
      case 'followUp':
        return 'Reminder';
      case 'response':
        return direction === 'inbound' ? 'Customer Reply' : 'Response';
      case 'cancelled':
      case 'cancelledByCustomer':
        return 'Cancelled';
      case 'tableReleased':
      case 'autoCancel':
      case 'autoCancelled':
        return 'Table Released';
      default:
        return type || 'Message';
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
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6">
          {/* Conversation List */}
          <div className="md:col-span-5 lg:col-span-4">
            <Card className="h-[550px] lg:h-[620px] flex flex-col bg-panel border border-border shadow-soft">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-lg">{t('conversations')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <div className="divide-y divide-border h-full overflow-y-auto">
                  {filteredConversations.map((conv) => {
                    const lastMessage = conv.lastMessage;
                    const isSelected = selectedPhone === conv.customerPhone;

                    return (
                      <div
                        key={conv.customerPhone}
                        className={`p-3.5 sm:p-4 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary/5 border-l-4 border-l-primary'
                            : 'hover:bg-off'
                        }`}
                        onClick={() => setSelectedPhone(conv.customerPhone)}
                      >
                        <div className="flex items-center justify-between mb-1.5 gap-2">
                          <h3 className="font-medium text-sm sm:text-base truncate">{conv.customerName || t('unknown')}</h3>
                          {lastMessage && (
                            <Badge className={`${getMessageTypeColor(lastMessage.messageType)} border-0 text-[10px] sm:text-[11px] px-2 py-0.5 shrink-0`}>
                              {getMessageTypeLabel(lastMessage.messageType, lastMessage.direction)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted truncate mb-1.5">{lastMessage?.content || ''}</p>
                        <div className="flex items-center justify-between text-[11px] sm:text-xs text-muted">
                          <span className="flex items-center">
                            <Phone className="h-3 w-3 mr-1 shrink-0" />
                            <span className="truncate max-w-[120px] sm:max-w-none">{conv.customerPhone}</span>
                          </span>
                          {lastMessage?.createdAt && (
                            <span className="shrink-0">
                              {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Message Thread */}
          <div className="md:col-span-7 lg:col-span-8">
            <Card className="h-[550px] lg:h-[620px] flex flex-col bg-panel border border-border shadow-soft">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="flex items-center text-lg">
                  <MessageSquare className="h-5 w-5 mr-2 text-primary shrink-0" />
                  <span className="truncate">
                    {selectedConversation
                      ? `${t('conversationWith')} ${selectedConversation.customerName || selectedConversation.customerPhone}`
                      : t('selectConversation')}
                  </span>
                </CardTitle>
                {selectedConversation && (
                  <CardDescription className="text-muted">
                    {selectedConversation.customerPhone}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-3 sm:p-6 overflow-hidden">
                {selectedConversation ? (
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    {selectedConversation.messages.map((message) => (
                      <div
                        key={message._id}
                        className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-md px-3.5 sm:px-4 py-2.5 rounded-xl ${
                            message.direction === 'outbound'
                              ? 'bg-primary text-white rounded-br-sm'
                              : 'bg-off ring-1 ring-border text-ink rounded-bl-sm'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-line">{message.content}</p>
                          <div className="flex items-center justify-between mt-2 gap-3">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                message.direction === 'outbound'
                                  ? 'border-white/30 text-white/90'
                                  : 'border-border text-muted'
                              }`}
                            >
                              {getMessageTypeLabel(message.messageType, message.direction)}
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
                    <div ref={messagesEndRef} />
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
