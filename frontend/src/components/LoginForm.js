import React, { useState } from 'react';
import './LoginForm.css';

const LoginForm = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('general');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      onLogin({ username: username.trim(), room });
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>Join Chat</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="room">Room:</label>
            <select
              id="room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            >
              <option value="general">General</option>
              <option value="tech">Tech</option>
              <option value="random">Random</option>
            </select>
          </div>
          <button type="submit" className="join-btn">
            Join Chat
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;