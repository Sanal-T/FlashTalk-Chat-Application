import React from 'react';

const UserList = ({ users, currentUser }) => {
  // Helper function to get user avatar initials
  const getAvatarText = (username) => {
    if (!username || typeof username !== 'string') return '?';
    
    // Handle usernames of any length
    const cleanName = username.trim();
    if (cleanName.length === 0) return '?';
    
    // For single character usernames
    if (cleanName.length === 1) {
      return cleanName.toUpperCase();
    }
    
    // For multi-character usernames
    const words = cleanName.split(/\s+/);
    if (words.length >= 2) {
      // If multiple words, use first letter of first two words
      return (words[0][0] + words[1][0]).toUpperCase();
    } else {
      // If single word with multiple characters, use first two characters
      return cleanName.substring(0, 2).toUpperCase();
    }
  };

  // Helper function to format username for display
  const formatUsername = (username) => {
    if (!username || typeof username !== 'string') return 'Unknown User';
    
    const cleanName = username.trim();
    if (cleanName.length === 0) return 'Unknown User';
    
    // Capitalize first letter of each word
    return cleanName
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Helper function to get user status
  const getUserStatus = (user) => {
    if (!user) return 'offline';
    
    // Check various possible status fields
    if (user.status) return user.status;
    if (user.isOnline !== undefined) return user.isOnline ? 'online' : 'offline';
    if (user.connected !== undefined) return user.connected ? 'online' : 'offline';
    if (user.active !== undefined) return user.active ? 'online' : 'away';
    
    return 'online'; // Default to online if no status info
  };

  // Helper function to get status display text
  const getStatusText = (status) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Away';
      case 'busy':
        return 'Busy';
      case 'offline':
        return 'Offline';
      default:
        return 'Online';
    }
  };

  // Filter and sort users
  const processedUsers = React.useMemo(() => {
    if (!Array.isArray(users)) return [];
    
    return users
      .filter(user => user && (user.username || user.name || user.id))
      .map(user => ({
        ...user,
        displayName: user.username || user.name || user.id || 'Unknown',
        status: getUserStatus(user),
        isCurrentUser: user.id === currentUser?.id || user.username === currentUser?.username
      }))
      .sort((a, b) => {
        // Sort current user first, then by status, then alphabetically
        if (a.isCurrentUser) return -1;
        if (b.isCurrentUser) return 1;
        
        const statusOrder = { 'online': 0, 'away': 1, 'busy': 2, 'offline': 3 };
        const statusDiff = (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
        if (statusDiff !== 0) return statusDiff;
        
        return a.displayName.localeCompare(b.displayName);
      });
  }, [users, currentUser]);

  if (!processedUsers.length) {
    return (
      <div className="user-list">
        <div className="empty-state">
          <p>No users online</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-list">
      {processedUsers.map((user) => (
        <div 
          key={user.id || user.username || Math.random()}
          className={`user-item ${user.isCurrentUser ? 'current-user' : ''}`}
          title={`${formatUsername(user.displayName)} - ${getStatusText(user.status)}`}
        >
          <div className="user-avatar">
            {getAvatarText(user.displayName)}
          </div>
          
          <div className="user-info">
            <div className="user-name">
              {formatUsername(user.displayName)}
              {user.isCurrentUser && <span className="you-indicator"> (You)</span>}
            </div>
            
            <div className="user-status">
              <span className={`status-indicator status-${user.status}`}></span>
              <span className="status-text">{getStatusText(user.status)}</span>
            </div>
          </div>
          
          {user.isCurrentUser && (
            <div className="current-user-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default UserList;