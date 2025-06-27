import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './Chat.css';

const Chat = ({ user, onLogout }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState('general');
  const [rooms] = useState([
    { id: 'general', name: 'General', unread: 0, lastMessage: 'Welcome to FlashTalk!' },
    { id: 'tech', name: 'Tech Talk', unread: 0, lastMessage: 'Discuss technology here' },
    { id: 'random', name: 'Random', unread: 0, lastMessage: 'Random conversations' },
  ]);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });
    
    setSocket(newSocket);

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnectionStatus('connected');
      // Join the selected room after connection
      newSocket.emit('join_room', { room: selectedRoom, user });
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnectionStatus('disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnectionStatus('error');
    });

    // Chat event listeners
    newSocket.on('receive_message', (message) => {
      console.log('Received message:', message);
      if (message && message.user && message.text) {
        setMessages(prev => {
          // Prevent duplicate messages
          const exists = prev.some(m => m.id === message.id);
          if (exists) return prev;
          return [...prev, message];
        });
      }
    });

    newSocket.on('room_messages', (roomMessages) => {
      console.log('Received room messages:', roomMessages);
      if (Array.isArray(roomMessages)) {
        setMessages(roomMessages);
      }
    });

    newSocket.on('users_online', (users) => {
      console.log('Online users updated:', users);
      if (Array.isArray(users)) {
        setOnlineUsers(users);
      }
    });

    newSocket.on('user_typing', ({ user: typingUser, room }) => {
      if (room === selectedRoom && typingUser && typingUser.id !== user.id) {
        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.id !== typingUser.id);
          return [...filtered, typingUser];
        });
        
        // Clear typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u.id !== typingUser.id));
        }, 3000);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user, selectedRoom]);

  // Handle room changes
  useEffect(() => {
    if (socket && socket.connected) {
      console.log('Switching to room:', selectedRoom);
      setMessages([]); // Clear messages when switching rooms
      socket.emit('join_room', { room: selectedRoom, user });
    }
  }, [selectedRoom, socket, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && socket && socket.connected) {
      const message = {
        id: Date.now() + Math.random(), // Ensure unique ID
        text: newMessage.trim(),
        user: user,
        room: selectedRoom,
        timestamp: new Date().toISOString(),
      };
      
      console.log('Sending message:', message);
      socket.emit('send_message', message);
      setNewMessage('');
      setIsTyping(false);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!isTyping && socket && socket.connected && e.target.value.trim()) {
      setIsTyping(true);
      socket.emit('user_typing', { user, room: selectedRoom });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#10B981';
      case 'away': return '#F59E0B';
      case 'busy': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const handleRoomSwitch = (roomId) => {
    console.log('Switching to room:', roomId);
    setSelectedRoom(roomId);
  };

  const toggleUserProfile = () => {
    setShowUserProfile(!showUserProfile);
    console.log('Profile toggled:', !showUserProfile);
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
    console.log('Settings toggled:', !showSettings);
  };

  const handleLogout = () => {
    if (socket) {
      socket.disconnect();
    }
    onLogout();
  };

  return (
    <div className="chat-container">
      {/* Connection Status Indicator */}
      {connectionStatus !== 'connected' && (
        <div style={{
          position: 'fixed',
          top: 10,
          right: 10,
          background: connectionStatus === 'error' ? '#ef4444' : '#f59e0b',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          zIndex: 1000
        }}>
          {connectionStatus === 'connecting' && 'Connecting...'}
          {connectionStatus === 'disconnected' && 'Disconnected'}
          {connectionStatus === 'error' && 'Connection Error'}
        </div>
      )}

      {/* Sidebar */}
      <div className="sidebar">
        {/* User Profile Section */}
        <div className="user-profile-section">
          <div className="user-avatar-container">
            <div className="user-avatar">
              <img 
                src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=667eea&color=fff`} 
                alt={user.name}
              />
              <div className="status-indicator online"></div>
            </div>
            <div className="user-info">
              <h3>{user.name}</h3>
              <span className="user-status">
                {connectionStatus === 'connected' ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
          <div className="user-actions">
            <button 
              className="action-btn"
              onClick={toggleUserProfile}
              title="Profile"
            >
              👤
            </button>
            <button 
              className="action-btn"
              onClick={toggleSettings}
              title="Settings"
            >
              ⚙️
            </button>
            <button 
              className="action-btn logout-btn"
              onClick={handleLogout}
              title="Logout"
            >
              🚪
            </button>
          </div>
        </div>

        {/* Rooms Section */}
        <div className="rooms-section">
          <div className="section-header">
            <h4>Channels</h4>
            <button className="add-btn" title="Add Channel">
              ➕
            </button>
          </div>
          <div className="rooms-list">
            {rooms.map(room => (
              <div
                key={room.id}
                className={`room-item ${selectedRoom === room.id ? 'active' : ''}`}
                onClick={() => handleRoomSwitch(room.id)}
              >
                <div className="room-icon">
                  <span>#</span>
                </div>
                <div className="room-info">
                  <div className="room-name">{room.name}</div>
                  <div className="room-last-message">{room.lastMessage}</div>
                </div>
                {room.unread > 0 && (
                  <div className="unread-badge">{room.unread}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Online Users Section */}
        <div className="online-users-section">
          <div className="section-header">
            <h4>Online ({onlineUsers.length})</h4>
          </div>
          <div className="users-list">
            {onlineUsers.length === 0 ? (
              <div style={{ padding: '10px', textAlign: 'center', color: '#9CA3AF', fontSize: '12px' }}>
                No users online
              </div>
            ) : (
              onlineUsers.map(onlineUser => (
                <div key={onlineUser.id} className="user-item">
                  <div className="user-avatar-small">
                    <img 
                      src={onlineUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(onlineUser.name)}&background=random&size=32`} 
                      alt={onlineUser.name}
                    />
                    <div 
                      className="status-dot" 
                      style={{ backgroundColor: getStatusColor(onlineUser.status) }}
                    ></div>
                  </div>
                  <span className="user-name">{onlineUser.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="main-chat">
        {/* Chat Header */}
        <div className="chat-header">
          <div className="channel-info">
            <div className="channel-icon">
              <span>#</span>
            </div>
            <div className="channel-details">
              <h2>{rooms.find(r => r.id === selectedRoom)?.name}</h2>
              <span className="member-count">{onlineUsers.length} members</span>
            </div>
          </div>
          <div className="header-actions">
            <button className="header-btn" title="Search">
              🔍
            </button>
            <button className="header-btn" title="Call">
              📞
            </button>
            <button className="header-btn" title="More">
              ⋮
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="messages-container">
          <div className="messages-area">
            {messages.length === 0 ? (
              <div className="welcome-message">
                <div className="welcome-icon">💬</div>
                <h3>Welcome to #{rooms.find(r => r.id === selectedRoom)?.name || 'Chat'}!</h3>
                <p>This is the beginning of your conversation in this channel.</p>
                {connectionStatus !== 'connected' && (
                  <p style={{ color: '#ef4444', marginTop: '10px' }}>
                    Please check your connection to start chatting.
                  </p>
                )}
              </div>
            ) : (
              messages.map((message, index) => {
                if (!message || !message.user) return null;
                
                return (
                  <div key={message.id || index} className="message">
                    <div className="message-avatar">
                      <img 
                        src={message.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.user.name || 'User')}&background=random&size=40`} 
                        alt={message.user.name || 'User'}
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(message.user.name || 'User')}&background=667eea&color=fff&size=40`;
                        }}
                      />
                    </div>
                    <div className="message-content">
                      <div className="message-header">
                        <span className="message-author">{message.user.name || 'Anonymous'}</span>
                        <span className="message-time">{formatTime(message.timestamp)}</span>
                      </div>
                      <div className="message-text">{message.text}</div>
                    </div>
                  </div>
                );
              })
            )}
            
            {/* Typing Indicators */}
            {typingUsers.length > 0 && (
              <div className="typing-indicator">
                <div className="typing-avatar">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
                <span className="typing-text">
                  {typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div className="message-input-container">
          <form onSubmit={sendMessage} className="message-form">
            <div className="input-wrapper">
              <button type="button" className="attachment-btn" title="Attach File">
                📎
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={handleTyping}
                placeholder={`Message #${rooms.find(r => r.id === selectedRoom)?.name}`}
                className="message-input"
                disabled={connectionStatus !== 'connected'}
              />
              <button type="button" className="emoji-btn" title="Add Emoji">
                😊
              </button>
              <button 
                type="submit" 
                className="send-btn" 
                disabled={!newMessage.trim() || connectionStatus !== 'connected'}
              >
                ➤
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Profile Modal */}
      {showUserProfile && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            minWidth: '300px',
            textAlign: 'center'
          }}>
            <h3>User Profile</h3>
            <img 
              src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=667eea&color=fff&size=80`}
              alt={user.name}
              style={{ width: '80px', height: '80px', borderRadius: '50%', margin: '10px' }}
            />
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Status:</strong> {connectionStatus === 'connected' ? 'Online' : 'Offline'}</p>
            <button 
              onClick={toggleUserProfile}
              style={{
                background: '#667eea',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            minWidth: '300px'
          }}>
            <h3>Settings</h3>
            <div style={{ margin: '15px 0' }}>
              <label>
                <input type="checkbox" /> Enable notifications
              </label>
            </div>
            <div style={{ margin: '15px 0' }}>
              <label>
                <input type="checkbox" /> Sound effects
              </label>
            </div>
            <div style={{ margin: '15px 0' }}>
              <label>
                Theme: 
                <select style={{ marginLeft: '10px' }}>
                  <option>Light</option>
                  <option>Dark</option>
                  <option>Auto</option>
                </select>
              </label>
            </div>
            <button 
              onClick={toggleSettings}
              style={{
                background: '#667eea',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;