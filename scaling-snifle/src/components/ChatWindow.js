import React, { useState } from 'react';

export default function ChatWindow({ selectedFriend, onClose }) {
  const [messageInput, setMessageInput] = useState('');

  if (!selectedFriend) {
    return (
      <div style={styles.container}>
        <p style={styles.placeholder}>Select a friend to start chatting</p>
      </div>
    );
  }

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      alert(`Message to ${selectedFriend.user_name}: ${messageInput}\n\n(Live messaging coming soon!)`);
      setMessageInput('');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.friendInfo}>
          <h3 style={styles.friendName}>{selectedFriend.user_name}</h3>
          <p style={styles.friendUsername}>@{selectedFriend.username}</p>
        </div>
        <button onClick={onClose} style={styles.closeButton}>✕</button>
      </div>

      <div style={styles.messagesArea}>
        <p style={styles.messagePlaceholder}>Messages coming soon...</p>
      </div>

      <div style={styles.inputArea}>
        <input
          type="text"
          placeholder="Type a message..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          style={styles.input}
        />
        <button onClick={handleSendMessage} style={styles.sendButton}>
          Send
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: '#fff',
    minHeight: 'calc(100vh - 60px)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    background: '#f9f9f9',
    borderBottom: '1px solid #ddd',
  },
  friendInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  friendName: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 'bold',
  },
  friendUsername: {
    margin: 0,
    fontSize: '12px',
    color: '#666',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#666',
  },
  messagesArea: {
    flex: 1,
    padding: '20px',
    overflowY: 'auto',
    background: '#fafafa',
  },
  messagePlaceholder: {
    color: '#999',
    textAlign: 'center',
    marginTop: '50px',
  },
  inputArea: {
    display: 'flex',
    gap: '10px',
    padding: '15px',
    background: '#f9f9f9',
    borderTop: '1px solid #ddd',
  },
  input: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontSize: '14px',
  },
  sendButton: {
    padding: '10px 20px',
    background: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
};
