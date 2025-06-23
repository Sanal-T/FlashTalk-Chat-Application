import React from 'react';
import './UserList.css';

const UserList = ({ users, currentUser }) => {
  return (
    <div className="user-list">
      <h3>Online Users ({users.length})</h3>
      <div className="users">
        {users.map((user) => (
          <div 
            key={user.id} 
            className={`user-item ${user.username === currentUser ? 'current-user' : ''}`}
          >
            <div className="user-status"></div>
            <span className="username">{user.username}</span>
            {user.username === currentUser && <span className="you-label">(You)</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserList;