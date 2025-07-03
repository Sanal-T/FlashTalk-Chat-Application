import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserList from './UserList';

const Chat = ({ currentUser, onLogout }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [roomInfo, setRoomInfo] = useState({ name: 'General', userCount: 0 });
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    if (!currentUser) return;

    const newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      
      // Join the chat with user info
      newSocket.emit('join_room', {
        username: currentUser.username || currentUser.name || 'Anonymous',
        room: 'general',
        userId: currentUser.id || Date.now().toString()
      });
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
    });

    // Message event handlers
    newSocket.on('receive_message', (messageData) => {
      console.log('Received message:', messageData);
      
      // Ensure message has proper structure
      const formattedMessage = {
        id: messageData.id || Date.now() + Math.random(),
        text: messageData.text || messageData.message || '',
        sender: messageData.sender || messageData.username || 'Unknown',
        senderId: messageData.senderId || messageData.userId,
        timestamp: messageData.timestamp || new Date().toISOString(),
        isOwn: messageData.senderId === currentUser.id || messageData.sender === currentUser.username
      };
      
      setMessages(prev => [...prev, formattedMessage]);
    });

    // User management event handlers
    newSocket.on('user_joined', (data) => {
      console.log('User joined:', data);
      
      if (data.username && data.username !== currentUser.username) {
        const joinMessage = {
          id: Date.now() + Math.random(),
          text: `${data.username} joined the chat`,
          sender: 'System',
          timestamp: new Date().toISOString(),
          isSystem: true
        };
        setMessages(prev => [...prev, joinMessage]);
      }
    });

    newSocket.on('user_left', (data) => {
      console.log('User left:', data);
      
      if (data.username && data.username !== currentUser.username) {
        const leaveMessage = {
          id: Date.now() + Math.random(),
          text: `${data.username} left the chat`,
          sender: 'System',
          timestamp: new Date().toISOString(),
          isSystem: true
        };
        setMessages(prev => [...prev, leaveMessage]);
      }
    });

    newSocket.on('users_update', (usersData) => {
      console.log('Users update:', usersData);
      
      // Handle different possible data structures
      let usersList = [];
      
      if (Array.isArray(usersData)) {
        usersList = usersData;
      } else if (usersData.users && Array.isArray(usersData.users)) {
        usersList = usersData.users;
      } else if (typeof usersData === 'object') {
        usersList = Object.values(usersData);
      }
      
      // Format users data consistently
      const formattedUsers = usersList.map(user => {
        if (typeof user === 'string') {
          return {
            id: user,
            username: user,
            status: 'online'
          };
        }
        
        return {
          id: user.id || user.username || user.socketId,
          username: user.username || user.name || user.id,
          status: user.status || 'online',
          isOnline: user.isOnline !== undefined ? user.isOnline : true
        };
      });
      
      setUsers(formattedUsers);
      setRoomInfo(prev => ({
        ...prev,
        userCount: formattedUsers.length
      }));
    });

    // Typing indicators
    newSocket.on('user_typing', (data) => {
      if (data.username !== currentUser.username) {
        setTypingUsers(prev => {
          if (!prev.includes(data.username)) {
            return [...prev, data.username];
          }
          return prev;
        });

        // Clear typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(user => user !== data.username));
        }, 3000);
      }
    });

    newSocket.on('user_stopped_typing', (data) => {
      setTypingUsers(prev => prev.filter(user => user !== data.username));
    });

    // Room info updates
    newSocket.on('room_info', (roomData) => {
      setRoomInfo({
        name: roomData.name || 'General',
        userCount: roomData.userCount || users.length
      });
    });

    // Message history
    newSocket.on('message_history', (history) => {
      console.log('Received message history:', history);
      
      if (Array.isArray(history)) {
        const formattedHistory = history.map(msg => ({
          id: msg._id || msg.id || Date.now() + Math.random(),
          text: msg.text || msg.message || '',
          sender: msg.sender || msg.username || 'Unknown',
          senderId: msg.senderId || msg.userId,
          timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
          isOwn: msg.senderId === currentUser.id || msg.sender === currentUser.username
        }));
        
        setMessages(formattedHistory);
      }
    });

    // Cleanup function
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentUser, users.length]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Update room info when users list changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setRoomInfo(prev => ({
      ...prev,
      userCount: users.length
    }));
  }, [users.length]);

  // Handle sending messages
  const handleSendMessage = (messageText) => {
    if (!socket || !messageText.trim() || !isConnected) return;

    const messageData = {
      text: messageText.trim(),
      sender: currentUser.username || currentUser.name || 'Anonymous',
      senderId: currentUser.id || Date.now().toString(),
      timestamp: new Date().toISOString(),
      room: 'general'
    };

    console.log('Sending message:', messageData);
    socket.emit('send_message', messageData);

    // Add message to local state immediately for better UX
    const localMessage = {
      ...messageData,
      id: Date.now() + Math.random(),
      isOwn: true
    };
    
    setMessages(prev => [...prev, localMessage]);
  };

  // Handle typing indicators
  const handleTyping = () => {
    if (!socket || !isConnected) return;

    socket.emit('user_typing', {
      username: currentUser.username || currentUser.name || 'Anonymous',
      room: 'general'
    });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('user_stopped_typing', {
        username: currentUser.username || currentUser.name || 'Anonymous',
        room: 'general'
      });
    }, 1000);
  };

  // Handle logout
  const handleLogout = () => {
    if (socket) {
      socket.emit('user_leaving', {
        username: currentUser.username || currentUser.name || 'Anonymous',
        room: 'general'
      });
      socket.disconnect();
    }
    onLogout();
  };

  if (!currentUser) {
    return <div className="chat-error">Please log in to access the chat.</div>;
  }

  return (
    <div className="chat-container">
      {/* Sidebar with user list */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>FlashTalk</h2>
          <div className="room-info">
            <div className="room-name">{roomInfo.name}</div>
            <div className="room-stats">
              {roomInfo.userCount} {roomInfo.userCount === 1 ? 'user' : 'users'} online
            </div>
          </div>
          <div className="connection-status">
            <span className={`status-indicator ${isConnected ? 'status-online' : 'status-offline'}`}></span>
            <span className="status-text">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <UserList 
          users={users} 
          currentUser={currentUser}
        />

        <div className="sidebar-footer">
          <div className="current-user-info">
            <div className="user-avatar">
              {currentUser.username ? 
                (currentUser.username.length === 1 ? 
                  currentUser.username.toUpperCase() : 
                  currentUser.username.substring(0, 2).toUpperCase()
                ) : 
                '?'
              }
            </div>
            <div className="user-details">
              <div className="user-name">
                {currentUser.username || currentUser.name || 'Anonymous'}
              </div>
              <div className="user-status">
                <span className="status-indicator status-online"></span>
                <span className="status-text">Online</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="logout-button"
            title="Logout"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Main chat area */}
      <div className="chat-main">
        <div className="chat-header">
          <div className="chat-title-section">
            <h1 className="chat-title">{roomInfo.name}</h1>
            <p className="chat-subtitle">
              {roomInfo.userCount} {roomInfo.userCount === 1 ? 'member' : 'members'}
              {!isConnected && ' • Disconnected'}
            </p>
          </div>
          
          <div className="chat-actions">
            <button 
              className="action-button"
              title="Chat Settings"
              disabled={!isConnected}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
              </svg>
            </button>
          </div>
        </div>

        <MessageList 
          messages={messages}
          currentUser={currentUser}
          typingUsers={typingUsers}
        />
        
        <div ref={messagesEndRef} />

        <MessageInput 
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          disabled={!isConnected}
          typingUsers={typingUsers}
        />
      </div>
    </div>
  );
};

export default Chat;