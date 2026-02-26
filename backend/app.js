// app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const sseEmitter = require('./utils/sseEmitter');
require('dotenv').config();

const superAdminRoutes = require('./routes/superAdmin');
const restaurantRoutes = require('./routes/restaurant');
const bookingRoutes = require('./routes/booking');
const sseRoutes = require('./routes/sse');
const subscriptionRoutes = require('./routes/subscription');
const webhookRoutes = require('./routes/webhooks');
const authRoutes = require('./routes/auth');

const app = express();

// --- DB ---
connectDB();

// Register SSE emitter for use in controllers
app.set('sseEmitter', sseEmitter);

// --- Proxy awareness (needed behind App Runner/ELB for rate limits & IPs) ---
app.set('trust proxy', 1);

// --- Security ---
app.use(
  helmet({
    // Typical API defaults; loosen CSP only if you add HTML pages later
    contentSecurityPolicy: false, // APIs/SSE don’t need CSP; turn on if serving HTML
    crossOriginEmbedderPolicy: false,
  })
);

// --- CORS ---
const allowedOrigins = [
  'https://quickcheckin.vercel.app',
  'https://www.quickcheckin.ca',
  'https://www.quickcheckin.ca/',
  'https://quickcheckin.ca',
  'http://localhost:3000', // for local development
  // Add other origins as needed
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true); // allow server-to-server / curl
    const allowed = allowedOrigins.includes(origin);
    return allowed ? callback(null, true) : callback(new Error('CORS: Origin not allowed'));
  },
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400, // cache for 24 hours
};
app.use(cors(corsOptions));

// --- Compression ---
app.use(compression({
  filter: (req, res) => {
    if (req.originalUrl.includes('/api/sse')) {
      return false; // Don't compress SSE streams
    }
    // Fallback to standard filter function
    return compression.filter(req, res);
  }
}));

// --- Rate limiting (env-driven) ---
const WINDOW_MS = Number(process.env.RATE_WINDOW_MS || 15 * 60 * 1000);
const MAX_REQ = Number(process.env.RATE_MAX || 1000);
app.use(
  rateLimit({
    windowMs: WINDOW_MS,
    max: MAX_REQ,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// --- CRITICAL: Webhooks BEFORE JSON parser (needs raw body) ---
app.use('/api/webhooks', webhookRoutes);

// --- Parsers ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- Route Logging Middleware ---
app.use((req, res, next) => {
  console.log(`Route hit: ${req.method} ${req.originalUrl}`);
  next();
});

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/restaurant', restaurantRoutes, subscriptionRoutes);
app.use('/api', bookingRoutes);
app.use('/api/sse', sseRoutes);

// --- Health checks ---
app.get('/health', (_req, res) => res.status(200).json({ message: 'OK' }));

// --- 404 ---
app.use('*', (_req, res) => res.status(404).json({ message: 'Route not found' }));

// --- Error handler ---
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Something went wrong!' });
});

module.exports = app;
