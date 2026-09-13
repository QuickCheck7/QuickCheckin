const EventEmitter = require('events');
const Redis = require('ioredis');

// Create a global event emitter for SSE
class SSEEmitter extends EventEmitter {
  constructor() {
    super();
    this.clients = new Map(); // Map of restaurantId -> Set of response objects
    this.serverId = `server_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; // Unique ID for this server instance
    
    // Redis Setup for Horizontal Scaling
    const redisUrl = process.env.REDIS_URL;
    
    if (redisUrl) {
      console.log('[SSE] Initializing Redis Pub/Sub for Autoscaling...');
      
      // 1. Publisher (sends events to Redis)
      this.pub = new Redis(redisUrl, {
        retryStrategy: (times) => Math.min(times * 50, 2000), // Retry connection logic
        reconnectOnError: false
      });
      
      // 2. Subscriber (listens for events from other servers)
      this.sub = new Redis(redisUrl, {
        retryStrategy: (times) => Math.min(times * 50, 2000)
      });
      
      this.pub.on('error', (err) => console.error('[SSE] Redis Pub Error:', err));
      this.sub.on('error', (err) => console.error('[SSE] Redis Sub Error:', err));

      // Subscribe to all SSE channels
      this.sub.subscribe('sse-broadcast', (err) => {
        if (err) console.error('[SSE] Failed to subscribe to Redis channel:', err);
        else console.log('[SSE] Subscribed to Redis broadcast channel');
      });

      // Listen for messages from Redis (triggered by OTHER server instances only)
      this.sub.on('message', (channel, message) => {
        try {
          const { restaurantId, type, data, sourceServerId } = JSON.parse(message);
          // Skip if this message originated from this server (already delivered locally)
          if (sourceServerId === this.serverId) {
            return;
          }
          // Broadcast to LOCAL clients connected to THIS server instance
          this.sendToLocalClients(restaurantId, type, data);
        } catch (error) {
          console.error('[SSE] Error processing Redis message:', error);
        }
      });
    } else {
      console.warn('[SSE] NO REDIS_URL FOUND. Running in single-instance mode safely. Autoscaling will NOT work.');
    }
  }

  // Add a client connection
  addClient(restaurantId, res) {
    if (!this.clients.has(restaurantId)) {
      this.clients.set(restaurantId, new Set());
    }
    this.clients.get(restaurantId).add(res);
    
    console.log(`[SSE] Client connected for restaurant ${restaurantId}. Total: ${this.clients.get(restaurantId).size}`);
  }

  // Remove a client connection
  removeClient(restaurantId, res) {
    if (this.clients.has(restaurantId)) {
      this.clients.get(restaurantId).delete(res);
      console.log(`[SSE] Client disconnected from restaurant ${restaurantId}`);
    }
  }

  // PUBLIC API: Broadcast event (Using Redis if available, but always send locally too)
  sendToRestaurant(restaurantId, eventType, data) {
    console.log(`[SSE] 📤 Sending ${eventType} to restaurant ${restaurantId}`);
    
    // ALWAYS send to local clients first (immediate delivery for this server instance)
    this.sendToLocalClients(restaurantId, eventType, data);
    
    // ALSO publish to Redis for other server instances (if Redis is configured)
    if (this.pub && this.pub.status === 'ready') {
      this.pub.publish('sse-broadcast', JSON.stringify({
        restaurantId: restaurantId.toString(),
        type: eventType,
        data,
        sourceServerId: this.serverId
      })).catch(err => {
        console.error('[SSE] Redis publish failed (local delivery still worked):', err.message);
      });
    }
  }

  // BROADCAST API: (Using Redis if available)
  broadcast(eventType, data) {
    // Note: Implementing global broadcast via same channel logic if needed, 
    // but typically we broadcast to specific restaurant.
    // For now, ignoring global broadcast as applied to "all restaurants" isn't a primary use case yet.
    // If needed, we would publish to a 'sse-global' channel.
    console.warn('[SSE] Global broadcast not fully implemented over Redis yet.');
  }

  // INTERNAL: Send to locally connected clients
  sendToLocalClients(restaurantId, eventType, data) {
    const rid = restaurantId.toString();
    const clients = this.clients.get(rid);
    
    console.log(`[SSE] 📬 Broadcasting ${eventType} to ${clients?.size || 0} clients for restaurant ${rid}`);
    
    if (!clients || clients.size === 0) {
      console.log(`[SSE] ⚠️ No connected clients for restaurant ${rid}`);
      return;
    }

    const eventData = JSON.stringify({
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    });

    clients.forEach((res) => {
      try {
        if (res.writableEnded || res.destroyed) {
          this.removeClient(restaurantId, res);
          return;
        }
        res.write(`data: ${eventData}\n\n`);
      } catch (error) {
        console.error(`[SSE] Error broadcasting ${eventType} to client:`, error.message);
        this.removeClient(restaurantId, res);
      }
    });
  }
}

// Create singleton instance
const sseEmitter = new SSEEmitter();

// Listen for events from booking controller (Local events trigger the Redis publish)
sseEmitter.on('booking', ({ restaurantId, type, booking }) => {
  sseEmitter.sendToRestaurant(restaurantId, type, { booking });
});

sseEmitter.on('message', ({ restaurantId, type, customerPhone }) => {
  sseEmitter.sendToRestaurant(restaurantId, type, { customerPhone });
});

sseEmitter.on('table', ({ restaurantId, type, table }) => {
  sseEmitter.sendToRestaurant(restaurantId, type, { table });
});

sseEmitter.on('waitTime', ({ restaurantId, type, waitTimes }) => {
  sseEmitter.sendToRestaurant(restaurantId, type, { waitTimes });
});

module.exports = sseEmitter;
