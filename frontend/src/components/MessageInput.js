import React, { useState, useRef, useEffect } from 'react';

const MessageInput = ({ onSendMessage, onTyping, disabled = false }) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef(null);

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [disabled]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim() || disabled || isSending) {
      return;
    }

    setIsSending(true);
    
    try {
      await onSendMessage(message.trim());
      setMessage(''); // Clear input after sending
      
      // Refocus input
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);
    
    // Trigger typing indicator
    if (value.trim() && !disabled) {
      onTyping();
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="message-input-container">
      <form onSubmit={handleSubmit} className="message-input-form">
        <div className="input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={disabled ? "Connecting..." : "Type your message..."}
            disabled={disabled || isSending}
            className={`message-input ${disabled ? 'disabled' : ''}`}
            maxLength={500}
            autoComplete="off"
          />
          {message.length > 400 && (
            <div className="character-count">
              {message.length}/500
            </div>
          )}
        </div>
        
        <button
          type="submit"
          disabled={!message.trim() || disabled || isSending}
          className={`send-button ${(!message.trim() || disabled || isSending) ? 'disabled' : ''}`}
          title="Send message (Enter)"
        >
          {isSending ? (
            <div className="spinner">⟳</div>
          ) : (
            <span>➤</span>
          )}
        </button>
      </form>
      
      {message.length > 450 && (
        <div className="input-warning">
          Message is getting long. Consider breaking it into multiple messages.
        </div>
      )}
    </div>
  );
};

export default MessageInput;