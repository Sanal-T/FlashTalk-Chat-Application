import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import socketService from '../services/socket';
import { messageAPI } from '../services/api';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserList from './UserList';
import TypingIndicator from './TypingIndicator';
import toast from 'react-hot-toast';
import './Chat.css';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentRoom, setCurrentRoom] = useState('general');
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showUserList, setShowUserList] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const { user, logout } = useAuth();

  useEffect(() => {
    // Removed duplicate initializeChat function

    const setupSocketListeners = () => {
      socketService.onMessage((message) => {
        setMessages(prev => [...prev, message]);
      });

      socketService.onUsersUpdated((userList) => {
        setUsers(userList);
      });

      socketService.onTyping((data) => {
        if (data.room === currentRoom) {
          setTypingUsers(prev => {
            if (data.isTyping) {
              return prev.includes(data.username) ? prev : [...prev, data.username];
            } else {
              return prev.filter(username => username !== data.username);
            }
          });
        }
      });

      socketService.onError((error) => {
        console.error('Socket error:', error);
        toast.error(error.message || 'Connection error');
      });
    };

    initializeChat();
    setupSocketListeners();
    
    return () => {
      socketService.removeAllListeners();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    try {
      await loadMessages();
      socketService.joinRoom(currentRoom);
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      toast.error('Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await messageAPI.getMessages(currentRoom);
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const setupSocketListeners = () => {
    socketService.onMessage((message) => {
      setMessages(prev => [...prev, message]);
    });

    socketService.onUsersUpdated((userList) => {
      setUsers(userList);
    });

    socketService.onTyping((data) => {
      if (data.room === currentRoom) {
        setTypingUsers(prev => {
          if (data.isTyping) {
            return prev.includes(data.username) ? prev : [...prev, data.username];
          } else {
            return prev.filter(username => username !== data.username);
          }
        });
      }
    });

    socketService.onError((error) => {
      console.error('Socket error:', error);
      toast.error(error.message || 'Connection error');
    });
  };

  const handleSendMessage = async (content) => {
    if (!content.trim()) return;

    try {
      socketService.sendMessage({
        content: content.trim(),
        room: currentRoom
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await messageAPI.deleteMessage(messageId);
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
      toast.success('Message deleted');
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleEditMessage = async (messageId, newContent) => {
    try {
      const response = await messageAPI.editMessage(messageId, newContent);
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? response.data : msg
      ));
      toast.success('Message updated');
    } catch (error) {
      console.error('Failed to edit message:', error);
      toast.error('Failed to edit message');
    }
  };

  const handleTyping = (isTyping) => {
    if (isTyping) {
      socketService.startTyping(currentRoom);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        socketService.stopTyping(currentRoom);
      }, 3000);
    } else {
      socketService.stopTyping(currentRoom);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleUserList = () => {
    setShowUserList(!showUserList);
  };

  if (loading) {
    return (
      <div className="chat-loading">
        <div className="loading-spinner"></div>
        <p>Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-title">
          <h2>FlashTalk - {currentRoom}</h2>
          <span className="online-count">{users.length} online</span>
        </div>
        <div className="chat-actions">
          <button onClick={toggleUserList} className="users-button">
            👥 Users
          </button>
          <button onClick={logout} className="logout-button">
            Logout
          </button>
        </div>
      </div>

      <div className="chat-main">
        <div className="chat-messages">
          <MessageList
            messages={messages}
            currentUser={user}
            onDeleteMessage={handleDeleteMessage}
            onEditMessage={handleEditMessage}
          />
          <TypingIndicator users={typingUsers} />
          <div ref={messagesEndRef} />
        </div>

        {showUserList && (
          <UserList
            users={users}
            currentUser={user}
            onClose={() => setShowUserList(false)}
          />
        )}
      </div>

      <MessageInput
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        disabled={!socketService.isConnected()}
      />
    </div>
  );
};

export default Chat;