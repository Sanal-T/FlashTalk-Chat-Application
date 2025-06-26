import React, { useState, useEffect } from 'react';
import socket from './socket';

function Chat() {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState({});
  const [activeRooms, setActiveRooms] = useState([]);
  const [participants, setParticipants] = useState([]);

  const joinRoom = () => {
    if (username.trim() && room.trim()) {
      socket.emit('join_room', { room, username });
      setIsJoined(true);
    }
  };

 const sendMessage = () => {
  if (message.trim()) {
    const msgData = { sender: username, room, message };
    socket.emit('send_message', msgData);
    setMessage('');
  }
};

useEffect(() => {
  socket.on('receive_message', (data) => {
    const { room: msgRoom, sender, message } = data;
    setMessages((prev) => {
      const roomMessages = prev[msgRoom] || [];
      return {
        ...prev,
        [msgRoom]: [...roomMessages, { sender, message }],
      };
    });
  });

  socket.on('room_list', (rooms) => {
    setActiveRooms(rooms);
  });

  socket.on('user_list', (userList) => {
    setParticipants(userList);
  });

  return () => {
    socket.off('receive_message');
    socket.off('room_list');
    socket.off('user_list');
  };
}, []);


  if (!isJoined) {
    return (
      <div>
        <h2>Join a Chat Room</h2>
        <input
          placeholder="Your Name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          placeholder="Room Name"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
        />
        <button onClick={joinRoom}>Join</button>

       {activeRooms.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4>Active Rooms:</h4>
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            {activeRooms.map((r, idx) => (
              <li key={idx}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '20px' }}>
      <h2>Room: {room} | You: {username}</h2>

      <div style={{ marginBottom: '10px' }}>
        <strong>Participants:</strong>{' '}
        {participants.length > 0 ? participants.join(', ') : 'No one'}
      </div>

      <div
        style={{
          flexGrow: 1,
          overflowY: 'auto',
          border: '1px solid #ccc',
          padding: '10px',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {(messages[room] || []).map((msg, idx) => (
          <div
            key={idx}
            style={{
              background: msg.sender === username ? '#343a40' : '#495057',
              color: 'white',
              padding: '10px',
              borderRadius: '10px',
              marginBottom: '10px',
              alignSelf: msg.sender === username ? 'flex-end' : 'flex-start',
              maxWidth: '70%',
              wordBreak: 'break-word',
            }}
          >
            <strong>{msg.sender}:</strong> <br />
            {msg.message}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
      <input
        style={{ flex: 1, padding: '10px', fontSize: '16px' }}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        onKeyDown={(e) => {
        if (e.key === 'Enter') sendMessage();
        }}
      />

        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default Chat;
