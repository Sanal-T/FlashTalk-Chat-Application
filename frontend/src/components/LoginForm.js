import React, { useState, useEffect, useRef } from 'react';

const LoginForm = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const usernameInputRef = useRef(null);

  // Focus username input on mount
  useEffect(() => {
    if (usernameInputRef.current) {
      usernameInputRef.current.focus();
    }
  }, []);

  // Validation functions
  const validateUsername = (value) => {
    const trimmedValue = value.trim();
    
    if (!trimmedValue) {
      return 'Username is required';
    }
    
    if (trimmedValue.length < 1) {
      return 'Username must be at least 1 character';
    }
    
    if (trimmedValue.length > 50) {
      return 'Username must be less than 50 characters';
    }
    
    // Allow letters, numbers, spaces, hyphens, underscores, and dots
    const validUsernameRegex = /^[a-zA-Z0-9\s\-_.]+$/;
    if (!validUsernameRegex.test(trimmedValue)) {
      return 'Username can only contain letters, numbers, spaces, hyphens, underscores, and dots';
    }
    
    return null;
  };

  const validateEmail = (value) => {
    if (!showAdvanced || !value.trim()) return null;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value.trim())) {
      return 'Please enter a valid email address';
    }
    
    return null;
  };

  // Handle input changes
  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setUsername(value);
    
    // Clear username error when user starts typing
    if (errors.username) {
      setErrors(prev => ({ ...prev, username: null }));
    }
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    
    // Clear email error when user starts typing
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: null }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLoading) return;
    
    // Validate inputs
    const usernameError = validateUsername(username);
    const emailError = validateEmail(email);
    
    const newErrors = {};
    if (usernameError) newErrors.username = usernameError;
    if (emailError) newErrors.email = emailError;
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    setErrors({});
    
    try {
      const userData = {
        username: username.trim(),
        id: Date.now().toString(), // Generate unique ID
        joinedAt: new Date().toISOString()
      };
      
      // Add email if provided
      if (showAdvanced && email.trim()) {
        userData.email = email.trim();
      }
      
      // Simulate network delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Call the login callback
      onLogin(userData);
      
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ general: 'Login failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Generate preview avatar
  const getPreviewAvatar = () => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername) return '?';
    
    if (trimmedUsername.length === 1) {
      return trimmedUsername.toUpperCase();
    }
    
    const words = trimmedUsername.split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    } else {
      return trimmedUsername.substring(0, 2).toUpperCase();
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <div className="login-header">
          <h2>Join FlashTalk</h2>
          <p className="login-subtitle">Enter your details to start chatting</p>
        </div>

        {/* Avatar Preview */}
        <div className="avatar-preview">
          <div className="preview-avatar">
            {getPreviewAvatar()}
          </div>
          <p className="preview-text">Your avatar preview</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* General Error */}
          {errors.general && (
            <div className="error-message general-error">
              {errors.general}
            </div>
          )}

          {/* Username Field */}
          <div className="form-group">
            <label htmlFor="username">
              Username <span className="required">*</span>
            </label>
            <div className="input-wrapper">
              <input
                ref={usernameInputRef}
                type="text"
                id="username"
                value={username}
                onChange={handleUsernameChange}
                onKeyPress={handleKeyPress}
                placeholder="Enter your username (any length)"
                className={`form-input ${errors.username ? 'error' : ''}`}
                disabled={isLoading}
                maxLength={50}
                autoComplete="username"
                spellCheck={false}
              />
              <div className="input-info">
                <span className="character-count">
                  {username.length}/50
                </span>
              </div>
            </div>
            {errors.username && (
              <div className="error-message">
                {errors.username}
              </div>
            )}
            <div className="field-help">
              Your username can be any length from 1-50 characters
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <div className="advanced-toggle">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="toggle-button"
              disabled={isLoading}
            >
              <span>Advanced Options</span>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                className={`toggle-icon ${showAdvanced ? 'rotated' : ''}`}
              >
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
          </div>

          {/* Email Field (Advanced) */}
          {showAdvanced && (
            <div className="form-group advanced-field">
              <label htmlFor="email">
                Email (Optional)
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={handleEmailChange}
                onKeyPress={handleKeyPress}
                placeholder="your.email@example.com"
                className={`form-input ${errors.email ? 'error' : ''}`}
                disabled={isLoading}
                autoComplete="email"
              />
              {errors.email && (
                <div className="error-message">
                  {errors.email}
                </div>
              )}
              <div className="field-help">
                Email is optional and only used for avatar generation
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="login-button"
            disabled={isLoading || !username.trim()}
          >
            {isLoading ? (
              <span className="loading-content">
                <svg className="loading-spinner" width="16" height="16" viewBox="0 0 24 24">
                  <circle 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    fill="none" 
                    strokeDasharray="31.416" 
                    strokeDashoffset="31.416"
                  />
                </svg>
                Joining...
              </span>
            ) : (
              'Join Chat'
            )}
          </button>
        </form>

        {/* Tips */}
        <div className="login-tips">
          <h4>Tips:</h4>
          <ul>
            <li>Your username can be any length (1-50 characters)</li>
            <li>Use letters, numbers, spaces, and common symbols</li>
            <li>Your avatar will be generated from your username</li>
            <li>Press Enter to quickly join the chat</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <p>
            By joining, you agree to be respectful and follow our community guidelines.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;