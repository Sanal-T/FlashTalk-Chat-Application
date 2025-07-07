const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const { body, validationResult } = require('express-validator');
const path = require('path');
require('dotenv').config();

// === Import routes and socket handlers ===
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/message');
const { handleSocketConnection } = require('./socket');

// === App setup ===
const app = express();
const server = http.createServer(app); // ✅ Create server BEFORE passing to initSocket

// === Socket.IO setup ===
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// === Middleware ===
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

// === Routes ===
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

// === Serve frontend (production) ===
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

// === MongoDB ===
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/chat', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB connected');
}).catch((err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

// === Socket.IO connection handler ===
io.on('connection', (socket) => {
  handleSocketConnection(io, socket);
});

// ✅ Only now is server ready – everything is initialized
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
