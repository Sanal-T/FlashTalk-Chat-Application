const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/flashtalk', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Message Schema
const messageSchema = new mongoose.Schema({
  username: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  room: { type: String, default: 'general' }
});

const Message = mongoose.model('Message', messageSchema);

// Store online users
const onlineUsers = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user joining
  socket.on('user_joined', (userData) => {
    console.log('User joined:', userData);
    
    // Store user info
    onlineUsers.set(socket.id, {
      id: socket.id,
      username: userData.username || `User${Math.floor(Math.random() * 1000)}`,
      joinedAt: new Date()
    });

    // Join default room
    socket.join('general');

    // Broadcast updated online users count and list
    const usersList = Array.from(onlineUsers.values());
    io.emit('online_users_updated', {
      count: usersList.length,
      users: usersList
    });

    // Send recent messages to the newly connected user
    Message.find({ room: 'general' })
      .sort({ timestamp: -1 })
      .limit(50)
      .then(messages => {
        socket.emit('message_history', messages.reverse());
      })
      .catch(err => console.error('Error fetching messages:', err));
  });

  // Handle sending messages
  socket.on('send_message', async (messageData) => {
    console.log('Message received:', messageData);
    
    try {
      // Create and save message to database
      const newMessage = new Message({
        username: messageData.username || onlineUsers.get(socket.id)?.username || 'Anonymous',
        content: messageData.content,
        room: messageData.room || 'general',
        timestamp: new Date()
      });

      const savedMessage = await newMessage.save();
      console.log('Message saved:', savedMessage);

      // Broadcast message to all users in the room
      io.to(messageData.room || 'general').emit('receive_message', {
        id: savedMessage._id,
        username: savedMessage.username,
        content: savedMessage.content,
        timestamp: savedMessage.timestamp
      });

    } catch (error) {
      console.error('Error saving message:', error);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    socket.to(data.room || 'general').emit('user_typing', {
      username: data.username,
      isTyping: true
    });
  });

  socket.on('typing_stop', (data) => {
    socket.to(data.room || 'general').emit('user_typing', {
      username: data.username,
      isTyping: false
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove user from online users
    onlineUsers.delete(socket.id);

    // Broadcast updated online users count and list
    const usersList = Array.from(onlineUsers.values());
    io.emit('online_users_updated', {
      count: usersList.length,
      users: usersList
    });
  });
});

// API Routes for messages
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await Message.find({ room: req.query.room || 'general' })
      .sort({ timestamp: -1 })
      .limit(100);
    res.json(messages.reverse());
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { username, content, room } = req.body;
    const newMessage = new Message({
      username,
      content,
      room: room || 'general'
    });
    const savedMessage = await newMessage.save();
    res.status(201).json(savedMessage);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    onlineUsers: onlineUsers.size,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`MongoDB URI: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/flashtalk'}`);
});