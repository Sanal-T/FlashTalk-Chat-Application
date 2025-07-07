// backend/socket.js
const { Server } = require("socket.io");

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('🟢 New client connected:', socket.id);

    socket.on('joinRoom', (room) => {
      socket.join(room);
      console.log(`${socket.id} joined room: ${room}`);
    });

    socket.on('sendMessage', (data) => {
      io.to(data.room).emit('message', data);
    });

    socket.on('typing', (data) => {
      io.to(data.room).emit('typing', data);
    });

    socket.on('disconnect', () => {
      console.log('🔴 Client disconnected:', socket.id);
    });
  });
};

module.exports = initSocket;
