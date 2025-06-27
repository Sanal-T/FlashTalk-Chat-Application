import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(serverUrl = 'http://localhost:3001') {
    try {
      if (this.socket) {
        this.disconnect();
      }

      this.socket = io(serverUrl, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        transports: ['websocket', 'polling']
      });

      this.setupEventListeners();
      return this.socket;
    } catch (error) {
      console.error('Socket connection error:', error);
      throw error;
    }
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Connected to server:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔥 Connection error:', error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected to server, attempt:', attemptNumber);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('🔥 Reconnection error:', error);
    });
  }

  // Join a room
  joinRoom(username, room) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_room', { username, room });
    } else {
      console.error('Socket not connected - cannot join room');
    }
  }

  // Leave a room
  leaveRoom(username, room) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_room', { username, room });
    }
  }

  // Send a message
  sendMessage(username, room, message) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('send_message', {
        username,
        room,
        message,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('Socket not connected - cannot send message');
      throw new Error('Not connected to server');
    }
  }

  // Typing indicators
  startTyping(username, room) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing', { username, room });
    }
  }

  stopTyping(username, room) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('stop_typing', { username, room });
    }
  }

  // Event listeners
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      // Store callback for cleanup
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event).add(callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
      if (this.listeners.has(event)) {
        this.listeners.get(event).delete(callback);
      }
    }
  }

  // Remove all listeners for an event
  removeAllListeners(event) {
    if (this.socket) {
      this.socket.removeAllListeners(event);
      this.listeners.delete(event);
    }
  }

  // Get connection status
  isConnected() {
    return this.socket && this.socket.connected;
  }

  // Get socket ID
  getSocketId() {
    return this.socket ? this.socket.id : null;
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      // Clean up all listeners
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          this.socket.off(event, callback);
        });
      });
      this.listeners.clear();

      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Force reconnection
  reconnect() {
    if (this.socket) {
      this.socket.connect();
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;