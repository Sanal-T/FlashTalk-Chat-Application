import React, { useState } from 'react';
import Chat from './components/chat.js';
import LoginForm from './components/LoginForm';
import './App.css';

function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLeave = () => {
    setUser(null);
  };

  return (
    <div className="App">
      {user ? (
        <Chat user={user} onLeave={handleLeave} />
      ) : (
        <LoginForm onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;