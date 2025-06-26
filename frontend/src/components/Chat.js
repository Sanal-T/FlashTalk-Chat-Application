import React, { useState, useEffect } from 'react';
import socket from './socket';

function Chat() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState('');
  const [isUsernameSet, setIsUsernameSet] = useState(false);

  const sendMessage = () => {
    if (message.trim()) {
      const messageData = {
        sender: username,
        message: message,
      };
      socket.emit('send_message', messageData);
      setMessages(prev => [...prev, messageData]);
      setMessage('');
    }
  };

  useEffect(() => {
    socket.on('receive_message', (data) => {
      setMessages(prev => [...prev, data]);
    });

    return () => socket.off('receive_message');
  }, []);

  if (!isUsernameSet) {
    return (
      <div>
        <h2>Enter your name to start chatting:</h2>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your name"
        />
        <button onClick={() => username.trim() && setIsUsernameSet(true)}>Join Chat</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Welcome, {username}</h2>
      <div style={{ height: '200px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
        {messages.map((msg, idx) => (
          <div key={idx}>
            <strong>{msg.sender}:</strong> {msg.message}
          </div>
        ))}
      </div>
      <input 
        value={message} 
        onChange={(e) => setMessage(e.target.value)} 
        placeholder="Type something..." 
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}

export default Chat;
