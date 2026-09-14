// server.js
require('dotenv').config();
const http = require('http');
const app = require('./app');
const { stopNotificationSweeper } = require('./utils/notificationTimers');

const PORT = process.env.PORT || 5172;   // App Runner injects PORT
const HOST = '0.0.0.0';                  // bind to all interfaces

const server = http.createServer(app);

server.listen(PORT, HOST, () => {
  console.log(`[server] Listening on http://${HOST}:${PORT}`);
});

// Graceful shutdown (helps zero-downtime deploys)
function shutdown(signal) {
  console.log(`[server] ${signal} received, closing server...`);
  stopNotificationSweeper();
  server.close(() => {
    console.log('[server] Closed. Bye!');
    process.exit(0);
  });
  // Force-exit if it hangs
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
