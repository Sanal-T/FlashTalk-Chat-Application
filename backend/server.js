const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));

// Socket.IO logic
const activeUsers = {}; // room => [user1, user2, ...]
const activeRooms = new Set();

io.on('connection', (socket) => {
  console.log(`New socket connected: ${socket.id}`);

  socket.on('join_room', ({ room, username }) => {
    socket.join(room);
    socket.data.username = username;
    socket.data.room = room;

    activeRooms.add(room);

    // Add user to activeUsers[room]
    if (!activeUsers[room]) {
      activeUsers[room] = [];
    }

    if (!activeUsers[room].includes(username)) {
      activeUsers[room].push(username);
    }

    // Notify all users in the room of updated user list
    io.to(room).emit('user_list', activeUsers[room]);

    // Also update the global room list
    io.emit('room_list', Array.from(activeRooms));
    console.log(`${username} joined room ${room}`);
  });

  socket.on('send_message', ({ room, sender, message }) => {
    io.to(room).emit('receive_message', { sender, message, room });
  });

  socket.on('get_rooms', () => {
    socket.emit('room_list', Array.from(activeRooms));
  });

  socket.on('disconnect', () => {
    const { room, username } = socket.data;

    if (room && username) {
      if (activeUsers[room]) {
        activeUsers[room] = activeUsers[room].filter((u) => u !== username);

        // Remove room if empty
        if (activeUsers[room].length === 0) {
          delete activeUsers[room];
          activeRooms.delete(room);
        }

        // Update others in the room
        io.to(room).emit('user_list', activeUsers[room] || []);
      }
    }

    console.log(`Socket disconnected: ${socket.id}`);
  });
});




const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
