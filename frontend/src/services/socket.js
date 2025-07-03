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
      maxReconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
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
  sendMessage(messageData) {
    if (this.socket) {
      this.socket.emit('send_message', messageData);
    }
  }

  onMessage(callback) {
    if (this.socket) {
      this.socket.on('receive_message', callback);
    }
  }

  // Room methods
  joinRoom(roomId) {
    if (this.socket) {
      this.socket.emit('join_room', roomId);
    }
  }

  // Typing methods
  startTyping(room) {
    if (this.socket) {
      this.socket.emit('typing_start', { room });
    }
  }

  stopTyping(room) {
    if (this.socket) {
      this.socket.emit('typing_stop', { room });
    }
  }

  onTyping(callback) {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  // User methods
  onUsersUpdated(callback) {
    if (this.socket) {
      this.socket.on('users_updated', callback);
    }
  }

  // Error handling
  onError(callback) {
    if (this.socket) {
      this.socket.on('error', callback);
    }
  }

  // Remove listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners(); // Use with caution!
    }
  }
}

const initializeSocket = new SocketService();
export default initializeSocket;