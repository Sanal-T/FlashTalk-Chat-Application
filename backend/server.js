const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Import routes and middleware
const messageRoutes = require('./routes/messages');
const userRoutes = require('./routes/users');
const { rateLimit } = require('./middleware/auth');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(rateLimit(100, 15 * 60 * 1000)); // 100 requests per 15 minutes

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatapp';
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    // Clean up old messages (optional)
    cleanupOldMessages();
  })
  .catch(err => {
    console.log('❌ MongoDB connection error:', err.message);
    console.log('📝 Running in memory-only mode');
  });

// Cleanup function for old messages (keep last 1000 messages per room)
async function cleanupOldMessages() {
  try {
    const rooms = await Message.distinct('room');
    for (const room of rooms) {
      const messageCount = await Message.countDocuments({ room });
      if (messageCount > 1000) {
        const messagesToDelete = messageCount - 1000;
        const oldMessages = await Message.find({ room })
          .sort({ timestamp: 1 })
          .limit(messagesToDelete)
          .select('_id');
        
        const ids = oldMessages.map(msg => msg._id);
        await Message.deleteMany({ _id: { $in: ids } });
        console.log(`🧹 Cleaned up ${messagesToDelete} old messages from room: ${room}`);
      }
    }
  } catch (error) {
    console.log('Cleanup error:', error.message);
  }
}

// In-memory storage for active users and temporary messages
let activeUsers = new Map(); // socketId -> user info
let roomUsers = new Map(); // room -> Set of usernames
let typingUsers = new Map(); // room -> Set of usernames

// API Routes
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Chat server is running',
    timestamp: new Date().toISOString(),
    activeConnections: activeUsers.size
  });
});

// Get server stats
app.get('/api/stats', async (req, res) => {
  try {
    const totalMessages = await Message.countDocuments();
    const rooms = await Message.distinct('room');
    
    res.json({
      success: true,
      stats: {
        activeConnections: activeUsers.size,
        totalRooms: rooms.length,
        totalMessages,
        rooms: Array.from(roomUsers.entries()).map(([room, users]) => ({
          name: room,
          activeUsers: users.size
        }))
      }
    });
  } catch (error) {
    res.json({
      success: true,
      stats: {
        activeConnections: activeUsers.size,
        totalRooms: roomUsers.size,
        totalMessages: 0,
        rooms: Array.from(roomUsers.entries()).map(([room, users]) => ({
          name: room,
          activeUsers: users.size
        }))
      }
    });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`👋 New client connected: ${socket.id}`);

  // Handle user joining
  socket.on('join', async (userData) => {
    try {
      const { username, room = 'general' } = userData;
      
      if (!username || username.trim().length < 1) {
        socket.emit('error', { message: 'Invalid username' });
        return;
      }

      const user = {
        id: socket.id,
        username: username.trim(),
        room: room.toLowerCase(),
        joinedAt: new Date()
      };

      // Store user info
      activeUsers.set(socket.id, user);
      
      // Add to room users
      if (!roomUsers.has(user.room)) {
        roomUsers.set(user.room, new Set());
      }
      roomUsers.get(user.room).add(user.username);
      
      // Join socket room
      socket.join(user.room);
      
      console.log(`✅ ${user.username} joined room: ${user.room}`);

      // Send welcome message to user
      socket.emit('message', {
        id: `welcome_${Date.now()}`,
        username: 'System',
        message: `Welcome to ${user.room} chat, ${user.username}! 🎉`,
        timestamp: new Date().toISOString(),
        room: user.room,
        messageType: 'system'
      });
      
      // Broadcast user joined to others in room
      socket.to(user.room).emit('message', {
        id: `join_${Date.now()}`,
        username: 'System',
        message: `${user.username} joined the chat 👋`,
        timestamp: new Date().toISOString(),
        room: user.room,
        messageType: 'system'
      });
      
      // Send updated user list to room
      const currentRoomUsers = Array.from(activeUsers.values())
        .filter(u => u.room === user.room)
        .map(u => ({
          id: u.id,
          username: u.username,
          joinedAt: u.joinedAt
        }));
      
      io.to(user.room).emit('userList', currentRoomUsers);
      
      // Send recent messages to user (from database or memory)
      try {
        const recentMessages = await Message.find({ room: user.room })
          .sort({ timestamp: -1 })
          .limit(50)
          .lean();
        
        // Reverse to get chronological order
        recentMessages.reverse();
        socket.emit('messageHistory', recentMessages);
      } catch (dbError) {
        console.log('Could not fetch message history from database');
      }
      
    } catch (error) {
      console.error('Join error:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Handle new message
  socket.on('sendMessage', async (messageData) => {
    try {
      const user = activeUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'User not found. Please rejoin.' });
        return;
      }

      const { message } = messageData;
      if (!message || message.trim().length === 0) {
        return;
      }

      if (message.trim().length > 1000) {
        socket.emit('error', { message: 'Message too long (max 1000 characters)' });
        return;
      }

      const messageObj = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        username: user.username,
        message: message.trim(),
        timestamp: new Date().toISOString(),
        room: user.room,
        messageType: 'user'
      };
      
      // Save to database (if available)
      try {
        const dbMessage = new Message({
          username: messageObj.username,
          message: messageObj.message,
          room: messageObj.room,
          messageType: messageObj.messageType
        });
        await dbMessage.save();
        messageObj.id = dbMessage._id;
      } catch (dbError) {
        console.log('Could not save message to database, using memory ID');
      }
      
      // Broadcast message to room
      io.to(user.room).emit('message', messageObj);
      
      console.log(`💬 ${user.username} sent a message to room: ${user.room}`);
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicator
  socket.on('typing', (isTyping) => {
    const user = activeUsers.get(socket.id);
    if (!user) return;
    
    if (!typingUsers.has(user.room)) {
      typingUsers.set(user.room, new Set());
    }
    
    const roomTyping = typingUsers.get(user.room);
    if (isTyping) {
      roomTyping.add(user.username);
    } else {
      roomTyping.delete(user.username);
    }
    
    io.to(user.room).emit('typingUsers', Array.from(roomTyping));
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      activeUsers.delete(socket.id);
      
      if (roomUsers.has(user.room)) {
        roomUsers.get(user.room).delete(user.username);
        if (roomUsers.get(user.room).size === 0) {
          roomUsers.delete(user.room);
        }
      }
      
      if (typingUsers.has(user.room)) {
        typingUsers.get(user.room).delete(user.username);
        if (typingUsers.get(user.room).size === 0) {
          typingUsers.delete(user.room);
        }
      }
      
      // Notify others in the room
      socket.to(user.room).emit('message', {
        id: `leave_${Date.now()}`,
        username: 'System',
        message: `${user.username} left the chat 👋`,
        timestamp: new Date().toISOString(),
        room: user.room,
        messageType: 'system'
      });
      
      // Update user list
      const currentRoomUsers = Array.from(activeUsers.values())
        .filter(u => u.room === user.room)
        .map(u => ({
          id: u.id,
          username: u.username,
          joinedAt: u.joinedAt
        }));
      
      io.to(user.room).emit('userList', currentRoomUsers);
      console.log(`👋 ${user.username} disconnected from room: ${user.room}`);
    }
  });
});

// Serve static files (for production build)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client', 'build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
  });
}

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});