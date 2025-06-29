// frontend/src/services/socket.js
import { io } from 'socket.io-client';

let socket = null;

// Debug: Check what URL we're trying to connect to
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
console.log('Attempting to connect to:', SOCKET_URL);

export const initializeSocket = (user) => {
  try {
    if (socket) {
      socket.disconnect();
    }

    console.log('Initializing socket connection...');
    
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: 5,
      timeout: 20000,
      forceNew: true,
      // Add CORS settings
      withCredentials: false,
      transports: ['websocket', 'polling']
    });

    // Enhanced connection event listeners with debugging
    socket.on('connect', () => {
      console.log('✅ Connected to server successfully');
      console.log('Socket ID:', socket.id);
      if (user) {
        socket.emit('user_connected', user);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('🔥 Connection error:', error);
      console.error('Error type:', error.type);
      console.error('Error description:', error.description);
      console.error('Error context:', error.context);
      console.error('Error transport:', error.transport);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected after', attemptNumber, 'attempts');
    });

    socket.on('reconnect_error', (error) => {
      console.error('🔄❌ Reconnection failed:', error);
    });

    socket.on('reconnect_failed', () => {
      console.error('🔄💀 Failed to reconnect to server after all attempts');
    });

    // Test connection immediately
    setTimeout(() => {
      if (socket.connected) {
        console.log('✅ Socket connection verified');
      } else {
        console.error('❌ Socket failed to connect within timeout');
        console.log('Socket state:', {
          connected: socket.connected,
          disconnected: socket.disconnected,
          id: socket.id
        });
      }
    }, 3000);

    return socket;
  } catch (error) {
    console.error('💥 Error initializing socket:', error);
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
      console.log('Socket disconnected and cleared');
    }
  } catch (error) {
    console.error('Error disconnecting socket:', error);
  }
};

export const emitMessage = (event, data) => {
  try {
    if (socket && socket.connected) {
      console.log(`📤 Emitting: ${event}`, data);
      socket.emit(event, data);
      return true;
    } else {
      console.warn(`📤❌ Cannot emit ${event}: Socket not connected`);
      console.log('Socket state:', {
        exists: !!socket,
        connected: socket?.connected,
        disconnected: socket?.disconnected
      });
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
      console.log(`📥 Listening for: ${event}`);
      socket.on(event, callback);
      return true;
    } else {
      console.warn(`📥❌ Cannot listen for ${event}: Socket not available`);
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
      console.log(`📥🔇 Stopped listening for: ${event}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error removing message listener:', error);
    return false;
  }
};

export const isSocketConnected = () => {
  const connected = socket && socket.connected;
  console.log('Socket connection check:', connected);
  return connected;
};