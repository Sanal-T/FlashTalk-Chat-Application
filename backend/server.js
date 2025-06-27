const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Store connected users and rooms
const users = new Map(); // socketId -> user info
const rooms = new Map(); // roomName -> Set of users
const userSockets = new Map(); // username -> socketId

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Handle user joining a room
  socket.on('join_room', (data) => {
    try {
      const { username, room } = data;
      
      if (!username || !room) {
        socket.emit('error', { message: 'Username and room are required' });
        return;
      }

      // Leave previous room if exists
      const previousUser = users.get(socket.id);
      if (previousUser) {
        socket.leave(previousUser.room);
        removeUserFromRoom(previousUser.username, previousUser.room);
      }

      // Join new room
      socket.join(room);
      
      // Store user info
      const userInfo = { username, room, socketId: socket.id };
      users.set(socket.id, userInfo);
      userSockets.set(username, socket.id);
      
      // Add user to room
      if (!rooms.has(room)) {
        rooms.set(room, new Set());
      }
      rooms.get(room).add(username);

      console.log(`${username} joined room: ${room}`);

      // Notify room about new user
      socket.to(room).emit('user_joined', {
        username,
        room,
        timestamp: new Date().toISOString()
      });

      // Send welcome message to user
      socket.emit('message', {
        username: 'System',
        message: `Welcome to ${room}!`,
        room,
        timestamp: new Date().toISOString(),
        type: 'system'
      });

      // Send room users update
      updateRoomUsers(room);
      updateGlobalUserCount();

    } catch (error) {
      console.error('Join room error:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Handle leaving a room
  socket.on('leave_room', (data) => {
    try {
      const { username, room } = data;
      socket.leave(room);
      removeUserFromRoom(username, room);
      
      // Notify room about user leaving
      socket.to(room).emit('user_left', {
        username,
        room,
        timestamp: new Date().toISOString()
      });

      updateRoomUsers(room);
      updateGlobalUserCount();
      
      console.log(`${username} left room: ${room}`);
    } catch (error) {
      console.error('Leave room error:', error);
    }
  });

  // Handle sending messages
  socket.on('send_message', (data) => {
    try {
      const { username, room, message, timestamp } = data;
      
      if (!message || !message.trim()) {
        return;
      }

      const messageData = {
        username,
        message: message.trim(),
        room,
        timestamp: timestamp || new Date().toISOString(),
        id: generateMessageId()
      };

      // Send message to all users in the room (including sender)
      io.to(room).emit('message', messageData);
      
      console.log(`Message from ${username} in ${room}: ${message}`);
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    try {
      const { username, room } = data;
      socket.to(room).emit('typing', { username, room });
    } catch (error) {
      console.error('Typing indicator error:', error);
    }
  });

  socket.on('stop_typing', (data) => {
    try {
      const { username, room } = data;
      socket.to(room).emit('stop_typing', { username, room });
    } catch (error) {
      console.error('Stop typing error:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    try {
      const user = users.get(socket.id);
      if (user) {
        const { username, room } = user;
        
        // Remove user from tracking
        users.delete(socket.id);
        userSockets.delete(username);
        removeUserFromRoom(username, room);
        
        // Notify room about user leaving
        socket.to(room).emit('user_left', {
          username,
          room,
          timestamp: new Date().toISOString()
        });

        updateRoomUsers(room);
        updateGlobalUserCount();
        
        console.log(`${username} disconnected from ${room}`);
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  });

  // Handle connection errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Helper functions
function removeUserFromRoom(username, room) {
  if (rooms.has(room)) {
    rooms.get(room).delete(username);
    if (rooms.get(room).size === 0) {
      rooms.delete(room);
    }
  }
}

function updateRoomUsers(room) {
  if (rooms.has(room)) {
    const roomUsers = Array.from(rooms.get(room));
    io.to(room).emit('room_users', {
      room,
      users: roomUsers,
      count: roomUsers.length
    });
    
    // Also update channel counts for all rooms
    const allRooms = ['general', 'random', 'tech', 'gaming'];
    allRooms.forEach(roomName => {
      const count = rooms.has(roomName) ? rooms.get(roomName).size : 0;
      io.emit('channel_count', { room: roomName, count });
    });
  }
}

function updateGlobalUserCount() {
  const totalUsers = users.size;
  io.emit('users_update', {
    users: Array.from(users.values()).map(user => user.username),
    count: totalUsers
  });
}

function generateMessageId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    users: users.size,
    rooms: rooms.size,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/rooms', (req, res) => {
  const roomData = {};
  rooms.forEach((users, room) => {
    roomData[room] = {
      users: Array.from(users),
      count: users.size
    };
  });
  res.json(roomData);
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 FlashTalk server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready for connections`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };