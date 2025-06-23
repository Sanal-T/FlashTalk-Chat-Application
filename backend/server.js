const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection (optional - you can run without database)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatapp';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log('MongoDB connection error:', err));

// In-memory storage for demo (replace with database in production)
let users = [];
let messages = [];

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Handle user joining
  socket.on('join', (userData) => {
    const user = {
      id: socket.id,
      username: userData.username,
      room: userData.room || 'general'
    };
    
    users.push(user);
    socket.join(user.room);
    
    // Send welcome message to user
    socket.emit('message', {
      id: Date.now(),
      username: 'System',
      message: `Welcome to the chat, ${user.username}!`,
      timestamp: new Date().toISOString(),
      room: user.room
    });
    
    // Broadcast user joined to others in room
    socket.to(user.room).emit('message', {
      id: Date.now(),
      username: 'System',
      message: `${user.username} has joined the chat`,
      timestamp: new Date().toISOString(),
      room: user.room
    });
    
    // Send updated user list to room
    const roomUsers = users.filter(u => u.room === user.room);
    io.to(user.room).emit('userList', roomUsers);
    
    // Send recent messages to user
    const roomMessages = messages
      .filter(msg => msg.room === user.room)
      .slice(-50); // Last 50 messages
    socket.emit('messageHistory', roomMessages);
  });

  // Handle new message
  socket.on('sendMessage', (messageData) => {
    const user = users.find(u => u.id === socket.id);
    if (user) {
      const message = {
        id: Date.now(),
        username: user.username,
        message: messageData.message,
        timestamp: new Date().toISOString(),
        room: user.room
      };
      
      messages.push(message);
      
      // Broadcast message to room
      io.to(user.room).emit('message', message);
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const user = users.find(u => u.id === socket.id);
    if (user) {
      socket.to(user.room).emit('userTyping', {
        username: user.username,
        isTyping: data.isTyping
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const userIndex = users.findIndex(u => u.id === socket.id);
    if (userIndex !== -1) {
      const user = users[userIndex];
      users.splice(userIndex, 1);
      
      // Broadcast user left to room
      socket.to(user.room).emit('message', {
        id: Date.now(),
        username: 'System',
        message: `${user.username} has left the chat`,
        timestamp: new Date().toISOString(),
        room: user.room
      });
      
      // Send updated user list to room
      const roomUsers = users.filter(u => u.room === user.room);
      io.to(user.room).emit('userList', roomUsers);
    }
    
    console.log('Client disconnected:', socket.id);
  });
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Chat server is running' });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});