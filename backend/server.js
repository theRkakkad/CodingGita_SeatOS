const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const checkBannedIp = require('./middleware/bannedIp');
const BannedIP = require('./models/BannedIP');

// Load environment variables
dotenv.config();

// Weakness 4 Mitigation: Prevent weak JWT secrets in production
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'supersecretjwtkeyforseatsyncbookingapp123!' || process.env.JWT_SECRET.length < 32) {
    console.error('CRITICAL SECURITY ERROR: You must set a strong, unique JWT_SECRET (at least 32 characters) in production!');
    process.exit(1);
  }
}

// Connect to MongoDB & Verify/Seed Database configurations
connectDB().then(async () => {
  try {
    console.log('Verifying database configurations and seeding state...');
    const seedData = require('./scripts/seed');
    await seedData(false);
    
    // Seed/verify 118 student accounts
    const seedStudents = require('./scripts/seedStudents');
    await seedStudents(false);
  } catch (err) {
    console.error('Automatic database verification/seeding failed:', err.message);
  }
});

const app = express();
const server = http.createServer(app);

// Trust proxy for retrieving correct client IPs (Set to 1 for Cloudflare/Vercel)
app.set('trust proxy', 1);

// Set secure headers with Helmet (Customized to avoid breaking OAuth)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: false, // Completely disable to fix Google popup issues
  referrerPolicy: { policy: "no-referrer-when-downgrade" }, // Fixes Google SDK origin issues
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'none'"],
      styleSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'none'"]
    }
  }, 
}));

// Cookie parser middleware
app.use(cookieParser());

// Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per `window`
  standardHeaders: true, 
  legacyHeaders: false, 
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 auth requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts from this IP, please try again after a minute' }
});

// Allowed frontend origins (configurable via .env, defaults to production only)
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['https://seat-booking-website-flax.vercel.app'];

// Enable CORS
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.error(`[CORS REJECTED] Origin not allowed by CORS policy: ${origin}`);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// Body parser
app.use(express.json());

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Share Socket.IO instance with routing handlers
app.set('io', io);

// Socket.IO Room Connections
const jwt = require('jsonwebtoken');

// WebSocket Authentication Middleware
io.use((socket, next) => {
  const cookieStr = socket.request.headers.cookie || '';
  const cookies = Object.fromEntries(cookieStr.split('; ').map(v => v.split('=').map(decodeURIComponent)));
  
  const token = cookies.accessToken;
  if (!token) {
    console.warn(`[SECURITY] Rejected unauthenticated socket connection: ${socket.id}`);
    return next(new Error('Authentication error'));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.warn(`[SECURITY] Rejected invalid socket token: ${socket.id}`);
      return next(new Error('Authentication error'));
    }
    socket.user = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id} (User: ${socket.user.id})`);

  // Join Classroom Room
  socket.on('join:classroom', ({ classroomId }) => {
    const roomName = `classroom:${classroomId}`;
    socket.join(roomName);
    console.log(`Socket ${socket.id} joined room: ${roomName}`);
  });

  // Leave Classroom Room
  socket.on('leave:classroom', ({ classroomId }) => {
    const roomName = `classroom:${classroomId}`;
    socket.leave(roomName);
    console.log(`Socket ${socket.id} left room: ${roomName}`);
  });

  // Join Student Room
  socket.on('join:student', ({ studentId }) => {
    const roomName = `student:${studentId}`;
    socket.join(roomName);
    console.log(`Socket ${socket.id} joined student room: ${roomName}`);
  });

  // Leave Student Room
  socket.on('leave:student', ({ studentId }) => {
    const roomName = `student:${studentId}`;
    socket.leave(roomName);
    console.log(`Socket ${socket.id} left student room: ${roomName}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Rate limiting configuration for login route to defend against brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 160, // Limit each IP to 160 login requests per windowMs
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Global Banned IP Check Middleware
app.use(checkBannedIp);

// Active Defense (Honeypot Routes)
app.all(['/wp-admin', '/.env', '/.git', '/api/admin/dump', '/phpmyadmin'], async (req, res) => {
  const rawIp = req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
  const ipAddress = rawIp.includes(',') ? rawIp.split(',')[0].trim() : rawIp.trim();
  
  try {
    await BannedIP.create({ ipAddress, reason: `Honeypot triggered on ${req.originalUrl}` });
    console.warn(`[SECURITY ALERT] Honeypot triggered by ${ipAddress}. IP permanently banned.`);
  } catch (err) {
    // Ignore duplicate key errors if already banned
  }
  
  return res.status(403).json({ error: 'Access Denied. Your IP address has been permanently blacklisted.' });
});

// Routes
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/classrooms', globalLimiter, require('./routes/classrooms'));
app.use('/api/seats', globalLimiter, require('./routes/seats'));
app.use('/api/student', globalLimiter, require('./routes/student'));
app.use('/api/master', globalLimiter, require('./routes/admin'));

// API Health Check
app.get('/', (req, res) => {
  res.send('SeatSync API is running...');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
