import React, { useState, useRef, useEffect } from 'react';

const MessageInput = ({ onSendMessage, onTyping, disabled, typingUsers = [] }) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 120; // Maximum height in pixels
      textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }
  };

  // Handle message change
  const handleMessageChange = (e) => {
    const value = e.target.value;
    
    // Allow any length username input
    setMessage(value);
    
    // Trigger typing indicator
    if (value.trim() && !isTyping && onTyping) {
      setIsTyping(true);
      onTyping();
    }

    // Clear typing timeout and set new one
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);

    // Auto-resize textarea
    setTimeout(adjustTextareaHeight, 0);
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle send message
  const handleSendMessage = () => {
    const trimmedMessage = message.trim();
    
    if (!trimmedMessage || disabled) return;

    // Send message
    onSendMessage(trimmedMessage);
    
    // Clear input
    setMessage('');
    setIsTyping(false);
    
    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Reset textarea height
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }, 0);

    // Focus back to input
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Format typing users display
  const getTypingDisplay = () => {
    if (!typingUsers.length) return '';
    
    const filteredUsers = typingUsers.filter(user => user && user.trim());
    
    if (filteredUsers.length === 0) return '';
    if (filteredUsers.length === 1) return `${filteredUsers[0]} is typing...`;
    if (filteredUsers.length === 2) return `${filteredUsers[0]} and ${filteredUsers[1]} are typing...`;
    if (filteredUsers.length > 2) {
      return `${filteredUsers[0]}, ${filteredUsers[1]} and ${filteredUsers.length - 2} others are typing...`;
    }
    
    return '';
  };

  // Focus input on mount
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="message-input-container">
      <div className="message-input-wrapper">
        <div className="typing-indicator">
          {getTypingDisplay()}
        </div>
        
        <div className="input-row">
          <div className="textarea-wrapper">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleMessageChange}
              onKeyPress={handleKeyPress}
              placeholder={disabled ? "Connecting..." : "Type your message..."}
              className="message-input"
              disabled={disabled}
              rows={1}
              maxLength={2000} // Reasonable message length limit
            />
            
            {message.trim() && (
              <div className="character-count">
                {message.length}/2000
              </div>
            )}
          </div>

          <div className="input-actions">
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!message.trim() || disabled}
              className="send-button"
              title="Send message (Enter)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Additional input features */}
        <div className="input-features">
          <button
            type="button"
            className="feature-button"
            title="Add emoji"
            disabled={disabled}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
          </button>

          <button
            type="button"
            className="feature-button"
            title="Attach file"
            disabled={disabled}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05L12.25 20.24C11.12 21.37 9.47 22 7.73 22S4.34 21.37 3.21 20.24C2.08 19.11 1.45 17.46 1.45 15.72S2.08 12.33 3.21 11.2L12.4 2.01C13.2 1.21 14.28 0.76 15.4 0.76S17.6 1.21 18.4 2.01C19.2 2.81 19.65 3.89 19.65 5.01S19.2 7.21 18.4 8.01L9.61 16.8C9.21 17.2 8.69 17.42 8.15 17.42S7.09 17.2 6.69 16.8C6.29 16.4 6.07 15.88 6.07 15.34S6.29 14.28 6.69 13.88L14.8 5.77"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageInput;