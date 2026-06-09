require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const db = require('./db');
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');
const startCleanupJob = require('./jobs/cleanup');

const app = express();
const server = http.createServer(app);
server.keepAliveTimeout = 61000;
server.headersTimeout = 62000;
const io = new Server(server, { cors: { origin: '*', methods: ['GET','POST','PATCH','PUT','DELETE'] } });

// Store io instance for routes
app.set('io', io);

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15*60*1000, max: 500, message: { error: 'Too many requests' } });
app.use('/api/', limiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Socket.io
io.on('connection', (socket) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🔌 Client connected: ${socket.id}`);
  }
  socket.on('join-room', (room) => { 
    socket.join(room); 
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📢 ${socket.id} joined ${room}`); 
    }
  });
  socket.on('disconnect', () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`❌ Client disconnected: ${socket.id}`);
    }
  });
});

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html')));
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🍽️  Smart Canteen Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready`);
  
  // Start background jobs
  startCleanupJob(io);
}).on('error', (err) => {
  console.error('❌ Server error:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`⚠️  Port ${PORT} is already in use. Kill the process or use PORT=3000 npm start`);
  }
  process.exit(1);
});
