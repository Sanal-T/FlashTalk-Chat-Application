import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './Chat.css';

const Chat = () => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
      transports: ['websocket', 'polling'],
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
      
      // Join with username if available
      if (username) {
        newSocket.emit('user_joined', { username });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    // Message event handlers
    newSocket.on('receive_message', (message) => {
      console.log('Received message:', message);
      setMessages(prevMessages => [...prevMessages, {
        id: message.id || Date.now(),
        username: message.username,
        content: message.content,
        timestamp: message.timestamp
      }]);
    });

    newSocket.on('message_history', (history) => {
      console.log('Received message history:', history);
      setMessages(history.map(msg => ({
        id: msg._id || msg.id || Date.now(),
        username: msg.username,
        content: msg.content,
        timestamp: msg.timestamp
      })));
    });

    // Online users event handlers
    newSocket.on('online_users_updated', (data) => {
      console.log('Online users updated:', data);
      setOnlineUsers(data.users || []);
      setOnlineCount(data.count || 0);
    });

    // Typing indicator handlers
    newSocket.on('user_typing', (data) => {
      if (data.username !== username) {
        setTypingUsers(prev => {
          if (data.isTyping) {
            return [...prev.filter(user => user !== data.username), data.username];
          } else {
            return prev.filter(user => user !== data.username);
          }
        });
      }
    });

    newSocket.on('message_error', (error) => {
      console.error('Message error:', error);
      alert('Failed to send message. Please try again.');
    });

    return () => {
      newSocket.close();
    };
  }, [username]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    if (trimmedUsername && socket) {
      socket.emit('user_joined', { username: trimmedUsername });
    }
  };

  const handleMessageSubmit = (e) => {
    e.preventDefault();
    const trimmedMessage = newMessage.trim();
    
    if (trimmedMessage && socket && isConnected && username) {
      console.log('Sending message:', { username, content: trimmedMessage });
      
      socket.emit('send_message', {
        username,
        content: trimmedMessage,
        room: 'general'
      });
      
      setNewMessage('');
      
      // Stop typing indicator
      if (isTyping) {
        socket.emit('typing_stop', { username, room: 'general' });
        setIsTyping(false);
      }
    }
  };

  const handleMessageChange = (e) => {
    setNewMessage(e.target.value);
    
    if (socket && username) {
      // Start typing indicator
      if (!isTyping) {
        socket.emit('typing_start', { username, room: 'general' });
        setIsTyping(true);
      }
      
      // Reset typing timeout
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_stop', { username, room: 'general' });
        setIsTyping(false);
      }, 2000);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // If no username is set, show username form
  if (!username) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h2>Welcome to FlashTalk</h2>
          <form onSubmit={handleUsernameSubmit}>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              maxLength={20}
            />
            <button type="submit">Join Chat</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-left">
          <h1>FlashTalk</h1>
          <span className="welcome-text">Welcome, {username}!</span>
        </div>
        <div className="header-right">
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          <button 
            className="logout-btn"
            onClick={() => {
              if (socket) socket.disconnect();
              setUsername('');
              setMessages([]);
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="chat-main">
        <div className="chat-messages">
          <div className="chat-room-header">
            <h2>Chat Room</h2>
          </div>
          
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="no-messages">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`message ${message.username === username ? 'own-message' : 'other-message'}`}
                >
                  <div className="message-header">
                    <span className="message-username">{message.username}</span>
                    <span className="message-time">{formatTimestamp(message.timestamp)}</span>
                  </div>
                  <div className="message-content">{message.content}</div>
                </div>
              ))
            )}
            
            {typingUsers.length > 0 && (
              <div className="typing-indicator">
                <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <form className="message-form" onSubmit={handleMessageSubmit}>
            <input
              type="text"
              placeholder="Type your message..."
              value={newMessage}
              onChange={handleMessageChange}
              disabled={!isConnected}
              maxLength={500}
            />
            <button type="submit" disabled={!isConnected || !newMessage.trim()}>
              Send
            </button>
          </form>
        </div>

        <div className="online-users">
          <div className="users-header">
            <h3>Online Users ({onlineCount})</h3>
          </div>
          <div className="users-list">
            {onlineUsers.map((user) => (
              <div key={user.id} className="user-item">
                <div className="user-avatar">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="user-name">{user.username}</span>
                {user.username === username && <span className="you-label">(You)</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;