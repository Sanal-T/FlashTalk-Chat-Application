import React, { useEffect, useRef } from 'react';
import './MessageList.css';

const MessageList = ({ messages, typingUsers }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="message-list">
      {messages.map((message) => (
        <div 
          key={message.id} 
          className={`message ${message.username === 'System' ? 'system-message' : ''}`}
        >
          <div className="message-header">
            <span className="username">{message.username}</span>
            <span className="timestamp">{formatTime(message.timestamp)}</span>
          </div>
          <div className="message-content">{message.message}</div>
        </div>
      ))}
      
      {/* Typing indicators */}
      {typingUsers.map((user) => (
        <div key={`typing-${user}`} className="typing-indicator">
          <span className="username">{user}</span>
          <span className="typing-text">is typing...</span>
          <div className="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      ))}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;