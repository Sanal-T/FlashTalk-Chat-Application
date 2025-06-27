import React, { useState, useEffect, useRef, useCallback } from 'react';
import socketService from '../services/socket';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserList from './UserList';
import './Chat.css';

const Chat = ({ username, room, onLeave }) => {
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [roomUsers, setRoomUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [currentRoom, setCurrentRoom] = useState(room);
  const [roomCounts, setRoomCounts] = useState({
    general: 0,
    random: 0,
    tech: 0,
    gaming: 0
  });

  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Available rooms
  const availableRooms = [
    { id: 'general', name: 'General', icon: '💬' },
    { id: 'random', name: 'Random', icon: '🎲' },
    { id: 'tech', name: 'Tech', icon: '💻' },
    { id: 'gaming', name: 'Gaming', icon: '🎮' }
  ];

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Set up socket event listeners
  const setupSocketListeners = useCallback(() => {
    // Connection events
    socketService.on('connect', () => {
      console.log('Connected to server');
      setConnectionStatus('connected');
    });

    socketService.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnectionStatus('disconnected');
    });

    socketService.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionStatus('disconnected');
    });

    // Message events
    socketService.on('message', (message) => {
      setMessages(prev => [...prev, message]);
      setTimeout(scrollToBottom, 100);
    });

    // User events
    socketService.on('user_joined', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        username: 'System',
        message: `${data.username} joined the chat`,
        timestamp: data.timestamp,
        type: 'system'
      }]);
    });

    socketService.on('user_left', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        username: 'System',
        message: `${data.username} left the chat`,
        timestamp: data.timestamp,
        type: 'system'
      }]);
    });

    // Users update
    socketService.on('users_update', (data) => {
      setOnlineUsers(data.users || []);
    });

    socketService.on('room_users', (data) => {
      if (data.room === currentRoom) {
        setRoomUsers(data.users || []);
      }
    });

    // Channel counts update
    socketService.on('channel_count', (data) => {
      setRoomCounts(prev => ({
        ...prev,
        [data.room]: data.count
      }));
    });

    // Typing indicators
    socketService.on('typing', (data) => {
      if (data.username !== username && data.room === currentRoom) {
        setTypingUsers(prev => {
          if (!prev.includes(data.username)) {
            return [...prev, data.username];
          }
          return prev;
        });
      }
    });

    socketService.on('stop_typing', (data) => {
      if (data.username !== username && data.room === currentRoom) {
        setTypingUsers(prev => prev.filter(user => user !== data.username));
      }
    });

    // Error handling
    socketService.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }, [username, currentRoom, scrollToBottom]);

  // Initialize socket connection
  useEffect(() => {
    const initializeConnection = async () => {
      try {
        setConnectionStatus('connecting');
        
        // Connect to socket
        socketService.connect();
        
        // Set up event listeners
        setupSocketListeners();
        
        // Join initial room
        socketService.joinRoom(username, currentRoom);
        
      } catch (error) {
        console.error('Failed to initialize connection:', error);
        setConnectionStatus('disconnected');
      }
    };

    initializeConnection();

    // Cleanup on unmount
    return () => {
      if (socketService.isConnected()) {
        socketService.leaveRoom(username, currentRoom);
        socketService.disconnect();
      }
    };
  }, [username, currentRoom, setupSocketListeners]);

  // Handle sending messages
  const handleSendMessage = useCallback((message) => {
    if (!message.trim() || !socketService.isConnected()) {
      return;
    }

    try {
      socketService.sendMessage(username, currentRoom, message);
      // Stop typing indicator
      socketService.stopTyping(username, currentRoom);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [username, currentRoom]);

  // Handle typing
  const handleTyping = useCallback(() => {
    if (!socketService.isConnected()) return;

    socketService.startTyping(username, currentRoom);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(username, currentRoom);
    }, 1000);
  }, [username, currentRoom]);

  // Handle room switching
  const handleRoomSwitch = useCallback((newRoom) => {
    if (newRoom === currentRoom || !socketService.isConnected()) {
      return;
    }

    try {
      // Leave current room
      socketService.leaveRoom(username, currentRoom);
      
      // Clear messages and typing indicators
      setMessages([]);
      setTypingUsers([]);
      setRoomUsers([]);
      
      // Join new room
      socketService.joinRoom(username, newRoom);
      setCurrentRoom(newRoom);
      
    } catch (error) {
      console.error('Failed to switch room:', error);
    }
  }, [username, currentRoom]);

  // Handle logout
  const handleLogout = useCallback(() => {
    try {
      if (socketService.isConnected()) {
        socketService.leaveRoom(username, currentRoom);
        socketService.disconnect();
      }
      onLeave();
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if there's an error
      onLeave();
    }
  }, [username, currentRoom, onLeave]);

  // Connection status indicator
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#27ae60';
      case 'connecting': return '#f39c12';
      case 'disconnected': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  return (
    <div className="chat-container">
      {/* Connection Status */}
      <div 
        className="connection-status"
        style={{ backgroundColor: getConnectionStatusColor() }}
      >
        {connectionStatus === 'connected' ? '🟢 Connected' : 
         connectionStatus === 'connecting' ? '🟡 Connecting...' : 
         '🔴 Disconnected'}
      </div>

      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>🚀 FlashTalk</h2>
          <div className="user-info">
            <div className="user-avatar">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <div className="username">{username}</div>
              <div className="user-stats">
                Online: {onlineUsers.length}
              </div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>

        {/* Channels */}
        <div className="channels">
          <h3>📋 Channels</h3>
          {availableRooms.map(roomInfo => (
            <div
              key={roomInfo.id}
              className={`channel-item ${currentRoom === roomInfo.id ? 'active' : ''}`}
              onClick={() => handleRoomSwitch(roomInfo.id)}
            >
              <span>{roomInfo.icon} {roomInfo.name}</span>
              <span className="channel-count">
                {roomCounts[roomInfo.id] || 0}
              </span>
            </div>
          ))}
        </div>

        {/* Online Users */}
        <UserList users={roomUsers} currentUser={username} />
      </div>

      {/* Main Chat Area */}
      <div className="main-content">
        {/* Chat Header */}
        <div className="chat-header">
          <div className="chat-title">
            #{currentRoom}
          </div>
          <div className="chat-info">
            {roomUsers.length} member{roomUsers.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Messages */}
        <div className="messages-area">
          <MessageList 
            messages={messages} 
            currentUser={username}
            typingUsers={typingUsers}
          />
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <MessageInput 
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          disabled={connectionStatus !== 'connected'}
        />
      </div>
    </div>
  );
};

export default Chat;