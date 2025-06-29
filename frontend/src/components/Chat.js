import React, { useState, useEffect, useCallback, useRef } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserList from './UserList';
import { getSocket, onMessage, offMessage, emitMessage, isSocketConnected } from '../services/socket';

const Chat = ({ user }) => {
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Handle received message
  const handleMessageReceived = useCallback((message) => {
    try {
      if (message && typeof message === 'object') {
        setMessages(prevMessages => {
          // Prevent duplicate messages
          const messageExists = prevMessages.some(m => 
            m.id === message.id || 
            (m.timestamp === message.timestamp && m.text === message.text && m.sender === message.sender)
          );
          
          if (!messageExists) {
            return [...prevMessages, {
              id: message.id || Date.now() + Math.random(),
              text: message.text || '',
              sender: message.sender || 'Unknown',
              timestamp: message.timestamp || new Date().toISOString()
            }];
          }
          return prevMessages;
        });
        scrollToBottom();
      }
    } catch (err) {
      console.error('Error handling received message:', err);
    }
  }, [scrollToBottom]);

  // Handle user list updates
  const handleUserListUpdate = useCallback((users) => {
    try {
      if (Array.isArray(users)) {
        setOnlineUsers(users.filter(u => u && u.id));
      }
    } catch (err) {
      console.error('Error updating user list:', err);
    }
  }, []);

  // Handle typing indicators
  const handleUserTyping = useCallback((data) => {
    try {
      if (data && data.userId && data.userId !== user?.id) {
        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.userId !== data.userId);
          return data.isTyping ? [...filtered, data] : filtered;
        });
      }
    } catch (err) {
      console.error('Error handling typing indicator:', err);
    }
  }, [user?.id]);

  // Handle connection status
  const handleConnectionStatus = useCallback((connected) => {
    setIsConnected(connected);
    if (connected) {
      setError(null);
    } else {
      setError('Connection lost. Attempting to reconnect...');
    }
  }, []);

  // Setup socket listeners
  useEffect(() => {
    const socket = getSocket();
    // Copy the ref value at the start of the effect
    const initialTypingTimeoutId = typingTimeoutRef.current;
    
    if (!socket) {
      setError('Socket connection not available');
      setIsLoading(false);
      return;
    }

    try {
      // Connection status listeners
      onMessage('connect', () => handleConnectionStatus(true));
      onMessage('disconnect', () => handleConnectionStatus(false));
      onMessage('connect_error', () => setError('Failed to connect to server'));
      
      // Message and user listeners
      onMessage('message_received', handleMessageReceived);
      onMessage('user_list_updated', handleUserListUpdate);
      onMessage('user_typing', handleUserTyping);
      
      // Load initial messages
      onMessage('message_history', (history) => {
        try {
          if (Array.isArray(history)) {
            setMessages(history.map(msg => ({
              id: msg.id || Date.now() + Math.random(),
              text: msg.text || '',
              sender: msg.sender || 'Unknown',
              timestamp: msg.timestamp || new Date().toISOString()
            })));
          }
        } catch (err) {
          console.error('Error loading message history:', err);
        } finally {
          setIsLoading(false);
        }
      });

      // Request initial data
      if (isSocketConnected()) {
        emitMessage('get_message_history');
        emitMessage('get_online_users');
        setIsConnected(true);
        setIsLoading(false);
      } else {
        setTimeout(() => setIsLoading(false), 3000); // Timeout fallback
      }

    } catch (err) {
      console.error('Error setting up socket listeners:', err);
      setError('Failed to setup chat connection');
      setIsLoading(false);
    }

    // Cleanup function
    return () => {
      try {
        offMessage('connect');
        offMessage('disconnect');
        offMessage('connect_error');
        offMessage('message_received');
        offMessage('user_list_updated');
        offMessage('user_typing');
        offMessage('message_history');
        
        if (initialTypingTimeoutId) {
          clearTimeout(initialTypingTimeoutId);
        }
      } catch (err) {
        console.error('Error cleaning up socket listeners:', err);
      }
    };
  }, [handleMessageReceived, handleUserListUpdate, handleUserTyping, handleConnectionStatus]);

  // Send message handler
  const handleSendMessage = useCallback((messageText) => {
    try {
      if (!messageText.trim() || !user) {
        return false;
      }

      const message = {
        text: messageText.trim(),
        sender: user.username || user.name || 'Anonymous',
        senderId: user.id,
        timestamp: new Date().toISOString(),
        id: Date.now() + Math.random()
      };

      if (isSocketConnected()) {
        emitMessage('send_message', message);
        
        // Optimistically add message to local state
        setMessages(prev => [...prev, message]);
        scrollToBottom();
        return true;
      } else {
        setError('Not connected to server. Please try again.');
        return false;
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      return false;
    }
  }, [user, scrollToBottom]);

  // Typing indicator handler
  const handleTyping = useCallback((isTyping) => {
    try {
      if (user && isSocketConnected()) {
        emitMessage('typing', {
          userId: user.id,
          username: user.username || user.name,
          isTyping
        });
      }
    } catch (err) {
      console.error('Error sending typing indicator:', err);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="chat-loading">
        <div className="loading-spinner"></div>
        <p>Loading chat...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="chat-error">
        <p>User information not available. Please log in again.</p>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {error && (
        <div className="chat-error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      
      <div className="chat-header">
        <h2>Chat Room</h2>
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </div>

      <div className="chat-body">
        <div className="chat-main">
          <MessageList 
            messages={messages} 
            currentUser={user}
            typingUsers={typingUsers}
          />
          <div ref={messagesEndRef} />
          
          <MessageInput 
            onSendMessage={handleSendMessage}
            onTyping={handleTyping}
            disabled={!isConnected}
          />
        </div>
        
        <div className="chat-sidebar">
          <UserList 
            users={onlineUsers} 
            currentUser={user}
          />
        </div>
      </div>
    </div>
  );
};

export default Chat;