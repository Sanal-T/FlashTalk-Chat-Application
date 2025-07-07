import React, { useState, useEffect } from 'react';
import './App.css';
import ErrorBoundary from './components/ErrorBoundary';
import Chat from './components/chat';
import LoginForm from './components/LoginForm';
import socketService from './services/socket';

import { Toaster } from 'react-hot-toast';

<>
  <Toaster />
  <App />
</>



function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is already logged in (from localStorage or session)
    const checkAuthStatus = async () => {
      try {
        const savedUser = localStorage.getItem('chatUser');
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          socketService.connect(userData);
        }
      } catch (err) {
        console.error('Error checking auth status:', err);
        setError('Failed to restore user session');
        // Clear potentially corrupted data
        localStorage.removeItem('chatUser');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, []);

  const handleLogin = async (userData) => {
    try {
      setError(null);
      setUser(userData);
      localStorage.setItem('chatUser', JSON.stringify(userData));
      socketService.connect(userData);
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to login. Please try again.');
    }
  };

  const handleLogout = () => {
    try {
      setUser(null);
      localStorage.removeItem('chatUser');
      socketService.disconnect();
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
      setError('Error during logout');
    }
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading FlashTalk...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="App">
        <header className="app-header">
          <h1>FlashTalk</h1>
          {user && (
            <div className="user-info">
              <span>Welcome, {user.username || user.name || 'User'}!</span>
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </div>
          )}
        </header>
        
        <main className="app-main">
          {error && (
            <div className="error-message">
              <p>{error}</p>
              <button onClick={() => setError(null)} className="dismiss-error">
                Dismiss
              </button>
            </div>
          )}
          
          {!user ? (
            <ErrorBoundary>
              <LoginForm onLogin={handleLogin} />
            </ErrorBoundary>
          ) : (
            <ErrorBoundary>
              <Chat user={user} />
            </ErrorBoundary>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;