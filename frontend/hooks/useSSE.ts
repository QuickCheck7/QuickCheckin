'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { apiClient } from '@/lib/api-client';

type SSEEventType = 'new_booking' | 'status_change' | 'new_message' | 'wait_time_update' | 'connected';

interface SSEEvent {
  type: SSEEventType;
  data: any;
  timestamp: string;
}

interface UseSSEOptions {
  restaurantId: string;
  onNewBooking?: (data: any) => void;
  onStatusChange?: (data: any) => void;
  onNewMessage?: (data: any) => void;
  onWaitTimeUpdate?: (data: { waitTimes: Record<number, number> }) => void;
  playSound?: boolean;
}

export function useSSE(options: UseSSEOptions) {
  const { restaurantId, onNewBooking, onStatusChange, onNewMessage, onWaitTimeUpdate, playSound = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);

  // Initialize audio for notification sound
  useEffect(() => {
    if (typeof window !== 'undefined' && playSound) {
      try {
        audioRef.current = new Audio('/sounds/bell_notification.mp3');
        audioRef.current.volume = 0.7;
        audioRef.current.preload = 'auto';
        
        // Handle audio load errors
        audioRef.current.onerror = (e) => {
          console.error('[Audio] Failed to load notification sound:', e);
        };
        
        audioRef.current.oncanplaythrough = () => {
          console.log('[Audio] Notification sound loaded and ready');
        };

        // Try to unlock audio on any user interaction (browser autoplay policy)
        const unlockAudio = async () => {
          if (!audioUnlockedRef.current && audioRef.current) {
            try {
              // Create a short silent play to unlock
              audioRef.current.volume = 0;
              await audioRef.current.play();
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
              audioRef.current.volume = 0.7;
              audioUnlockedRef.current = true;
              setIsAudioReady(true);
              console.log('[Audio] ✅ Notification sound unlocked successfully');
              
              // Remove listeners once unlocked
              document.removeEventListener('click', unlockAudio);
              document.removeEventListener('touchstart', unlockAudio);
              document.removeEventListener('keydown', unlockAudio);
            } catch (err) {
              console.log('[Audio] Could not unlock yet, waiting for user interaction...');
            }
          }
        };

        // Add listeners for user interaction to unlock audio
        document.addEventListener('click', unlockAudio);
        document.addEventListener('touchstart', unlockAudio);
        document.addEventListener('keydown', unlockAudio);
        
        // Also try to unlock immediately in case autoplay is allowed
        unlockAudio();

        return () => {
          document.removeEventListener('click', unlockAudio);
          document.removeEventListener('touchstart', unlockAudio);
          document.removeEventListener('keydown', unlockAudio);
        };
      } catch (err) {
        console.error('[Audio] Error initializing notification sound:', err);
        audioRef.current = null;
      }
    }
  }, [playSound]);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current && playSound) {
      console.log('[Audio] 🔔 Attempting to play notification sound...');
      console.log('[Audio] Audio unlocked:', audioUnlockedRef.current);
      
      audioRef.current.currentTime = 0;
      audioRef.current.play()
        .then(() => {
          console.log('[Audio] ✅ Notification sound played successfully');
        })
        .catch(err => {
          console.error('[Audio] ❌ Failed to play notification sound:', err.message);
          console.log('[Audio] Tip: Click anywhere on the page to enable sounds');
        });
    } else {
      console.log('[Audio] Sound not available - audioRef:', !!audioRef.current, 'playSound:', playSound);
    }
  }, [playSound]);

  // Keep callbacks in ref to avoid reconnecting SSE on every render
  const callbacksRef = useRef({ onNewBooking, onStatusChange, onNewMessage, onWaitTimeUpdate });
  useEffect(() => {
    callbacksRef.current = { onNewBooking, onStatusChange, onNewMessage, onWaitTimeUpdate };
  });

  useEffect(() => {
    if (!restaurantId) return;

    let isMounted = true;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let retryDelay = 2000; // start at 2s

    const connect = () => {
      if (!isMounted) return;

      // Check token first - if not logged in yet, wait
      const token = typeof window !== 'undefined'
        ? (localStorage.getItem('sessionToken') || localStorage.getItem('token') || localStorage.getItem('preftech_token'))
        : null;

      if (!token || token === 'null' || token === 'undefined') {
        console.warn('[SSE] ⏳ No active auth token found yet. Will retry in 3 seconds...');
        if (isMounted) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
        return;
      }

      const sseUrl = apiClient.getSSEUrl(restaurantId);

      try {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }

        const es = new EventSource(sseUrl);
        eventSourceRef.current = es;

        es.onopen = () => {
          if (!isMounted) {
            es.close();
            return;
          }
          console.log('[SSE] ✅ Stream connected successfully for restaurant:', restaurantId);
          setIsConnected(true);
          retryDelay = 2000; // reset retry backoff on successful connection
        };

        es.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const eventData: SSEEvent = JSON.parse(event.data);

            switch (eventData.type) {
              case 'connected':
                console.log('[SSE] Connection confirmed by server');
                break;
              case 'new_booking':
                console.log('[SSE] 🆕 New booking received');
                playNotificationSound();
                callbacksRef.current.onNewBooking?.(eventData.data);
                break;
              case 'status_change':
                callbacksRef.current.onStatusChange?.(eventData.data);
                break;
              case 'new_message':
                callbacksRef.current.onNewMessage?.(eventData.data);
                break;
              case 'wait_time_update':
                callbacksRef.current.onWaitTimeUpdate?.(eventData.data);
                break;
            }
          } catch (e) {
            console.error('[SSE] Error parsing incoming event data:', e);
          }
        };

        es.onerror = (error) => {
          if (!isMounted) return;
          console.warn(`[SSE] ⚠️ Stream disconnected. Reconnecting in ${Math.round(retryDelay / 1000)}s...`);
          setIsConnected(false);
          es.close();

          reconnectTimeout = setTimeout(() => {
            if (isMounted) {
              retryDelay = Math.min(retryDelay * 1.5, 15000); // Exponential backoff up to 15s
              connect();
            }
          }, retryDelay);
        };
      } catch (error: any) {
        if (!isMounted) return;
        console.error('[SSE] Failed to initialize EventSource:', error.message);
        reconnectTimeout = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, [restaurantId, playNotificationSound]);

  return { isConnected, isAudioReady, testSound: playNotificationSound };
}
