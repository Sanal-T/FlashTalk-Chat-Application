import { io } from 'socket.io-client';

let socket = null;

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export const initializeSocket = (user) => {
  try {
    if (socket) {
      socket.disconnect();
    }

    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: 5,
      timeout: 20000,
      forceNew: true
    });

    // Add connection event listeners
    socket.on('connect', () => {
      console.log('Connected to server');
      if (user) {
        socket.emit('user_connected', user);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected after', attemptNumber, 'attempts');
    });

    socket.on('reconnect_error', (error) => {
      console.error('Reconnection failed:', error);
    });

    socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect to server');
    });

    return socket;
  } catch (error) {
    console.error('Error initializing socket:', error);
    return null;
  }
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  try {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  } catch (error) {
    console.error('Error disconnecting socket:', error);
  }
};

export const emitMessage = (event, data) => {
  try {
    if (socket && socket.connected) {
      socket.emit(event, data);
      return true;
    } else {
      console.warn('Socket not connected. Cannot emit:', event);
      return false;
    }
  } catch (error) {
    console.error('Error emitting message:', error);
    return false;
  }
};

export const onMessage = (event, callback) => {
  try {
    if (socket) {
      socket.on(event, callback);
      return true;
    } else {
      console.warn('Socket not available for listening to:', event);
      return false;
    }
  } catch (error) {
    console.error('Error setting up message listener:', error);
    return false;
  }
};

export const offMessage = (event, callback) => {
  try {
    if (socket) {
      if (callback) {
        socket.off(event, callback);
      } else {
        socket.off(event);
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error removing message listener:', error);
    return false;
  }
};

export const isSocketConnected = () => {
  return socket && socket.connected;
};