// frontend/src/services/socket.js

import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect(token) {
    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      upgrade: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to server');
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('⚠️ Disconnected from server');
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      this.connected = false;
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  isConnected() {
    return this.connected && this.socket?.connected;
  }

  // Message methods
  sendMessage(data) {
    this.socket?.emit('send_message', data);
  }

  onMessage(callback) {
    this.socket?.on('receive_message', callback);
  }

  // Room methods
  joinRoom(room) {
    this.socket?.emit('join_room', room);
  }

  // Typing
  startTyping(room) {
    this.socket?.emit('typing_start', { room });
  }

  stopTyping(room) {
    this.socket?.emit('typing_stop', { room });
  }

  onTyping(callback) {
    this.socket?.on('user_typing', callback);
  }

  // Users
  onUsersUpdated(callback) {
    this.socket?.on('users_updated', callback);
  }

  // Errors
  onError(callback) {
    this.socket?.on('error', callback);
  }

  removeAllListeners() {
    this.socket?.removeAllListeners();
  }
}

const socketService = new SocketService();
export default socketService;
