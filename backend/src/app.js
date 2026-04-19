const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const compression = require('compression');
const { Server } = require('socket.io');
const connectDB = require('./config/database');
const { attachChatSocket, emitChatMessage } = require('./socket/chatSocket');
const { attachBookingSocket, emitNewBookingRequest, emitBookingStatusUpdate } = require('./socket/bookingSocket');
const { attachMessagingSocket, attachCallingSocket } = require('./socket/messagingSocket');
require('dotenv').config();

const app = express();

const server = http.createServer(app);

const extraCorsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const isCorsOriginAllowed = (origin) => {
  if (!origin) {
    return true;
  }
  if (process.env.NODE_ENV !== 'production') {
    return ['http://localhost:3000', 'http://127.0.0.1:3000'].includes(origin);
  }
  const staticOrigins = [
    'https://assamrideconnect.com',
    'https://www.assamrideconnect.com',
    ...extraCorsOrigins,
  ];
  if (staticOrigins.includes(origin)) {
    return true;
  }
  return /^https:\/\/[\w.-]+\.vercel\.app$/.test(origin);
};

const corsOriginCallback = (origin, callback) => {
  if (isCorsOriginAllowed(origin)) {
    callback(null, true);
  } else {
    console.log("Blocked origin:", origin);
    callback(null, true);
  }
};

const corsOptions = {
  origin: corsOriginCallback,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

const io = new Server(server, {
  cors: {
    origin: corsOriginCallback,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

attachChatSocket(io);
attachBookingSocket(io);
attachMessagingSocket(io);
attachCallingSocket(io);
app.set('io', io);
app.set('emitChatMessage', emitChatMessage);
app.set('emitNewBookingRequest', emitNewBookingRequest);
app.set('emitBookingStatusUpdate', emitBookingStatusUpdate);

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// CORS (must include Vercel frontends — see corsAllowedOrigins)
//app.use(cors(corsOptions));
app.use(cors({
  origin: true,
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced request logging middleware
const requestLogger = require('./middleware/requestLogger');
app.use(requestLogger);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'AssamRideConnect API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/test', (req, res) => {
  res.send("WORKING BACKEND");
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rides', require('./routes/rides'));
app.use('/api/users', require('./routes/users'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/achievements', require('./routes/achievements'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/driver', require('./routes/driver'));
app.use('/api/cars', require('./routes/cars'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  // Enhanced error logging for production debugging
  console.error('=== GLOBAL ERROR HANDLER ===');
  console.error('Timestamp:', new Date().toISOString());
  console.error('Request URL:', req.originalUrl);
  console.error('Request Method:', req.method);
  console.error('Request Body:', req.body);
  console.error('Error Name:', err.name);
  console.error('Error Message:', err.message);
  console.error('Error Stack:', err.stack);
  console.error('Error Code:', err.code);
  console.error('=== END ERROR DETAILS ===');
  
  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      status: 'error',
      message: `${field} already exists`,
      field: field
    });
  }

  // MongoDB validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Token expired'
    });
  }

  // bcrypt errors
  if (err.message && err.message.includes('bcrypt')) {
    return res.status(500).json({
      status: 'error',
      message: 'Password processing error'
    });
  }

  // Mongoose connection errors
  if (err.name === 'MongooseServerSelectionError') {
    return res.status(503).json({
      status: 'error',
      message: 'Database connection error'
    });
  }

  if (err.name === 'MongooseError') {
    return res.status(500).json({
      status: 'error',
      message: 'Database operation error'
    });
  }

  // Handle undefined/null errors
  if (err.message && err.message.includes('Cannot read propert')) {
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error - data processing issue'
    });
  }

  // Handle timeout errors
  if (err.name === 'TimeoutError' || err.message.includes('timeout')) {
    return res.status(504).json({
      status: 'error',
      message: 'Request timeout'
    });
  }

  // Default error - never crash the server
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: {
        name: err.name,
        code: err.code
      }
    })
  });
});

// Process error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('=== UNCAUGHT EXCEPTION ===');
  console.error('Timestamp:', new Date().toISOString());
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  console.error('=== END UNCAUGHT EXCEPTION ===');
  
  // Don't exit the process in production, just log and continue
  if (process.env.NODE_ENV === 'production') {
    console.log('Uncaught exception handled, server continues running');
  } else {
    // In development, we might want to see the crash
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('=== UNHANDLED REJECTION ===');
  console.error('Timestamp:', new Date().toISOString());
  console.error('Promise:', promise);
  console.error('Reason:', reason);
  console.error('=== END UNHANDLED REJECTION ===');
  
  // Don't exit the process in production
  if (process.env.NODE_ENV === 'production') {
    console.log('Unhandled rejection handled, server continues running');
  } else {
    // In development, we might want to see the crash
    process.exit(1);
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`AssamRideConnect Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`API Base URL: http://localhost:${PORT}/api`);
  console.log(`WebSocket (Socket.IO) enabled`);
  console.log('Process error handlers installed');
});

module.exports = { app, server, io };