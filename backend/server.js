const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const socketAuth = require('./utils/socketAuth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Socket.IO authentication middleware
io.use(socketAuth);

// Socket.IO connection handling
const activeUsers = new Map();
const typingUsers = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId}`);
  
  // Add user to active users
  activeUsers.set(socket.userId, {
    id: socket.userId,
    username: socket.username,
    socketId: socket.id,
    status: 'online',
    lastSeen: new Date()
  });
  
  // Broadcast updated user list
  io.emit('users_updated', Array.from(activeUsers.values()));
  
  // Join user to their own room for private messages
  socket.join(socket.userId);
  
  // Handle joining rooms
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    socket.emit('joined_room', roomId);
  });
  
  // Handle sending messages
  socket.on('send_message', async (data) => {
    try {
      const Message = require('./models/Message');
      const message = new Message({
        sender: socket.userId,
        content: data.content,
        room: data.room || 'general',
        timestamp: new Date()
      });
      
      await message.save();
      await message.populate('sender', 'username');
      
      // Emit to room
      io.to(data.room || 'general').emit('receive_message', {
        _id: message._id,
        content: message.content,
        sender: message.sender,
        timestamp: message.timestamp,
        room: message.room
      });
      
    } catch (error) {
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  // Handle typing indicators
  socket.on('typing_start', (data) => {
    const room = data.room || 'general';
    if (!typingUsers.has(room)) {
      typingUsers.set(room, new Set());
    }
    typingUsers.get(room).add(socket.username);
    socket.to(room).emit('user_typing', {
      username: socket.username,
      isTyping: true,
      room: room
    });
  });
  
  socket.on('typing_stop', (data) => {
    const room = data.room || 'general';
    if (typingUsers.has(room)) {
      typingUsers.get(room).delete(socket.username);
      if (typingUsers.get(room).size === 0) {
        typingUsers.delete(room);
      }
    }
    socket.to(room).emit('user_typing', {
      username: socket.username,
      isTyping: false,
      room: room
    });
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
    activeUsers.delete(socket.userId);
    
    // Remove from typing users
    typingUsers.forEach((users, room) => {
      users.delete(socket.username);
      if (users.size === 0) {
        typingUsers.delete(room);
      }
    });
    
    // Broadcast updated user list
    io.emit('users_updated', Array.from(activeUsers.values()));
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server };