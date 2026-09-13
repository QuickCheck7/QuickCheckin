const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const sseEmitter = require('../utils/sseEmitter');

// SSE endpoint for real-time updates
router.get('/:restaurantId/events', (req, res) => {
  const { restaurantId } = req.params;

  // Validate token from query or Authorization header
  const rawToken = req.query.token || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const token = typeof rawToken === 'string' ? rawToken.trim() : '';

  if (!token || token === 'null' || token === 'undefined') {
    console.warn(`[SSE Auth] ⚠️ Connection rejected: Missing token for restaurant ${restaurantId}`);
    return res.status(401).json({ message: 'Authentication token required for SSE connection' });
  }

  // Verify JWT token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify authorization: token must match restaurantId or be a superadmin
    const isSuperAdmin = decoded.role === 'superadmin' || (decoded.id && !decoded.restaurantId);
    const tokenRestaurantId = decoded.restaurantId ? decoded.restaurantId.toString() : null;

    if (!isSuperAdmin && tokenRestaurantId !== restaurantId.toString()) {
      console.warn(`[SSE Auth] ⛔ Access denied: Token restaurant (${tokenRestaurantId}) does not match requested stream (${restaurantId})`);
      return res.status(403).json({ message: 'Access denied: Token not authorized for this restaurant stream' });
    }
  } catch (err) {
    console.warn(`[SSE Auth] ⚠️ Connection rejected: Invalid or expired token for restaurant ${restaurantId}: ${err.message}`);
    return res.status(401).json({ message: 'Invalid or expired authentication token', error: err.message });
  }

  // Set SSE response headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable proxy buffering (Nginx, Cloudflare)
    'Access-Control-Allow-Origin': req.headers.origin || '*',
    'Access-Control-Allow-Credentials': 'true'
  });

  // Send initial connection confirmation
  res.write(`data: ${JSON.stringify({ type: 'connected', restaurantId, timestamp: new Date().toISOString() })}\n\n`);

  // Register client in emitter
  sseEmitter.addClient(restaurantId, res);
  console.log(`[SSE] 🔌 Client connected successfully for restaurant: ${restaurantId}`);

  // Heartbeat to keep connection open through proxies (every 25 seconds)
  const heartbeat = setInterval(() => {
    try {
      if (res.writableEnded || res.destroyed) {
        cleanup();
        return;
      }
      res.write(`:heartbeat\n\n`);
    } catch (err) {
      console.error(`[SSE] Heartbeat error for restaurant ${restaurantId}:`, err.message);
      cleanup();
    }
  }, 25000);

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    clearInterval(heartbeat);
    sseEmitter.removeClient(restaurantId, res);
    console.log(`[SSE] 🔌 Client disconnected for restaurant: ${restaurantId}`);
  };

  req.on('close', cleanup);
  req.on('error', (err) => {
    console.error(`[SSE] Request socket error for restaurant ${restaurantId}:`, err.message);
    cleanup();
  });
  res.on('close', cleanup);
  res.on('finish', cleanup);
  res.on('error', (err) => {
    console.error(`[SSE] Response socket error for restaurant ${restaurantId}:`, err.message);
    cleanup();
  });
});

module.exports = router;