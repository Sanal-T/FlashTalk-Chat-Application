import React from 'react';

const TypingIndicator = ({ users }) => {
  if (!users.length) return null;
  return (
    <div className="typing-indicator">
      {users.join(', ')} {users.length > 1 ? 'are' : 'is'} typing...
    </div>
  );
};

export default TypingIndicator;
// This component displays a typing indicator for users in the chat.