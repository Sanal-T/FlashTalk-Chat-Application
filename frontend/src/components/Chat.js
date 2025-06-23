import React, { useState, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserList from './UserList';
import socketService from '../services/socket';
import './Chat.css';

const Chat = ({ user, onLeave }) => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  useEffect(() => {
    // Connect to socket and join room
    socketService.connect();
    socketService.joinRoom(user);

    // Set up event listeners
    socketService.onMessage((message) => {
      setMessages(prev => [...prev, message]);
    });

    socketService.onMessageHistory((history) => {
      setMessages(history);
    });

    socketService.onUserList((userList) => {
      setUsers(userList);
    });

    socketService.onUserTyping((data) => {
      setTypingUsers(prev => {
        if (data.isTyping) {
          return prev.includes(data.username) 
            ? prev 
            : [...prev, data.username];
        } else {
          return prev.filter(username => username !== data.username);
        }
      });
    });

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, [user]);

  const handleSendMessage = (message) => {
    socketService.sendMessage(message);
  };

  const handleTyping = (isTyping) => {
    socketService.setTyping(isTyping);
  };

  const handleLeave = () => {
    socketService.disconnect();
    onLeave();
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>Chat Room: {user.room}</h2>
        <button className="leave-button" onClick={handleLeave}>
          Leave Chat
        </button>
      </div>
      
      <div className="chat-body">
        <div className="chat-main">
          <MessageList messages={messages} typingUsers={typingUsers} />
          <MessageInput 
            onSendMessage={handleSendMessage}
            onTyping={handleTyping}
          />
        </div>
        
        <div className="chat-sidebar">
          <UserList users={users} currentUser={user.username} />
        </div>
      </div>
    </div>
  );
};

export default Chat;