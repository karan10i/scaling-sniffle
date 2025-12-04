import React, { useState } from 'react';
import Auth from './components/Auth';

function TopBar({ currentUser, onLogout, onAddFriend }) {
  const [friendName, setFriendName] = useState('');

  return (
    <div style={styles.topBar}>
      <div style={styles.userInfo}>
        <span style={{ color: '#fff' }}>Welcome, <strong>{currentUser}</strong></span>
      </div>
      <div style={styles.addFriendSection}>
        <input
          style={styles.friendInput}
          placeholder="Friend's username"
          value={friendName}
          onChange={(e) => setFriendName(e.target.value)}
        />
        <button
          style={styles.addButton}
          onClick={() => {
            if (friendName.trim()) {
              onAddFriend(friendName);
              setFriendName('');
            }
          }}
        >
          Add Friend
        </button>
      </div>
      <button style={styles.logoutButton} onClick={onLogout}>
        Logout
      </button>
    </div>
  );
}

function SideBar({ friends }) {
  return (
    <div style={styles.sideBar}>
      <h3>Friends</h3>
      <ul style={styles.friendList}>
        {friends.length === 0 ? (
          <li style={styles.noFriends}>No friends yet</li>
        ) : (
          friends.map((friend, index) => (
            <li key={index} style={styles.friendItem}>
              {friend}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function ChatWindow() {
  return (
    <div style={styles.chatWindow}>
      <h2>Chat Space</h2>
      <p style={{ color: '#888' }}>Select a friend to start chatting</p>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState(null);
  const [friends, setFriends] = useState([]);

  const handleLogin = (accessToken, user) => {
    setToken(accessToken);
    setUsername(user);
  };

  const handleLogout = () => {
    setToken(null);
    setUsername(null);
    setFriends([]);
  };

  const handleAddFriend = async (friendUsername) => {
    // For now, just add to local state
    // Later we'll connect to backend
    if (!friends.includes(friendUsername)) {
      setFriends([...friends, friendUsername]);
      alert(`Added ${friendUsername} as friend!`);
    } else {
      alert('Already in your friends list!');
    }
  };

  // If no token, show login/signup screen
  if (!token) {
    return <Auth onLogin={handleLogin} />;
  }

  // If logged in, show main chat app
  return (
    <div>
      <TopBar
        currentUser={username}
        onLogout={handleLogout}
        onAddFriend={handleAddFriend}
      />
      <div style={{ display: 'flex' }}>
        <SideBar friends={friends} />
        <ChatWindow />
      </div>
    </div>
  );
}

const styles = {
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 20px',
    background: '#282c34',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
  },
  addFriendSection: {
    display: 'flex',
    gap: '10px',
  },
  friendInput: {
    padding: '8px 12px',
    borderRadius: '5px',
    border: 'none',
    fontSize: '14px',
    width: '200px',
  },
  addButton: {
    padding: '8px 15px',
    background: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  logoutButton: {
    padding: '8px 15px',
    background: '#dc3545',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  sideBar: {
    width: '250px',
    background: '#f4f4f4',
    padding: '20px',
    minHeight: 'calc(100vh - 60px)',
    borderRight: '1px solid #ddd',
  },
  friendList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  friendItem: {
    padding: '10px',
    background: '#fff',
    marginBottom: '8px',
    borderRadius: '5px',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  noFriends: {
    color: '#888',
    fontStyle: 'italic',
  },
  chatWindow: {
    flex: 1,
    padding: '20px',
    background: '#fff',
    minHeight: 'calc(100vh - 60px)',
  },
};

export default App;