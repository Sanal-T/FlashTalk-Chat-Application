// Updated server.js to fix socket room joining and scoped message broadcast

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const roomUsers = {}; // { roomName: [usernames] }

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', ({ room, username }) => {
    socket.join(room);
    socket.username = username;
    socket.room = room;

    if (!roomUsers[room]) roomUsers[room] = [];
    roomUsers[room].push(username);

    io.to(room).emit('user_list', roomUsers[room]);
    console.log(`${username} joined room: ${room}`);
  });

  socket.on('send_message', ({ room, sender, message }) => {
    io.to(room).emit('receive_message', {
      sender,
      room,
      message,
    });
  });

  socket.on('disconnect', () => {
    const room = socket.room;
    const username = socket.username;

    if (room && roomUsers[room]) {
      roomUsers[room] = roomUsers[room].filter((name) => name !== username);
      io.to(room).emit('user_list', roomUsers[room]);
    }
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
