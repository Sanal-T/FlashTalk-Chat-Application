import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    this.socket = io(SOCKET_URL);
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Join a room
  joinRoom(userData) {
    if (this.socket) {
      this.socket.emit('join', userData);
    }
  }

  // Send message
  sendMessage(message) {
    if (this.socket) {
      this.socket.emit('sendMessage', { message });
    }
  }

  // Typing indicator
  setTyping(isTyping) {
    if (this.socket) {
      this.socket.emit('typing', { isTyping });
    }
  }

  // Event listeners
  onMessage(callback) {
    if (this.socket) {
      this.socket.on('message', callback);
    }
  }

  onMessageHistory(callback) {
    if (this.socket) {
      this.socket.on('messageHistory', callback);
    }
  }

  onUserList(callback) {
    if (this.socket) {
      this.socket.on('userList', callback);
    }
  }

  onUserTyping(callback) {
    if (this.socket) {
      this.socket.on('userTyping', callback);
    }
  }

  // Remove listeners
  removeListener(eventName) {
    if (this.socket) {
      this.socket.off(eventName);
    }
  }
}

const socketServiceInstance = new SocketService();
export default socketServiceInstance;