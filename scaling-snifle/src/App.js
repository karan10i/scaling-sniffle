import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import FriendSearch from './components/FriendSearch';
import UserProfile from './components/UserProfile';

function TopBar({ currentUser, onLogout }) {
  return (
    <div style={styles.topBar}>
      <div style={styles.userInfo}>
        <span style={{ color: '#fff' }}>🗨️ Chat App</span>
      </div>
      <div style={styles.userGreeting}>
        <span style={{ color: '#fff' }}>Welcome, <strong>{currentUser}</strong></span>
      </div>
      <button style={styles.logoutButton} onClick={onLogout}>
        Logout
      </button>
    </div>
  );
}

function SideBar({ token, friends, onFriendsUpdated }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleFriendAdded = () => {
    setRefreshKey(refreshKey + 1);
    onFriendsUpdated();
  };

  return (
    <div style={styles.sideBar}>
      <UserProfile token={token} key={refreshKey} />
      
      <h3>Add Friends</h3>
      <FriendSearch token={token} onFriendAdded={handleFriendAdded} />

      <h3>Your Friends</h3>
      <ul style={styles.friendList}>
        {friends.length === 0 ? (
          <li style={styles.noFriends}>No friends yet</li>
        ) : (
          friends.map((friend) => (
            <li key={friend.id} style={styles.friendItem}>
              <p style={styles.friendName}>{friend.user_name}</p>
              <p style={styles.friendUsername}>@{friend.username}</p>
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
  const [loading, setLoading] = useState(false);

  const handleLogin = (accessToken, user) => {
    setToken(accessToken);
    setUsername(user);
    fetchFriends(accessToken);
  };

  const fetchFriends = async (accessToken) => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/list-friends/', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await res.json();
      setFriends(data.friends || []);
    } catch (err) {
      console.error('Fetch friends error:', err);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    setToken(null);
    setUsername(null);
    setFriends([]);
  };

  const handleFriendsUpdated = () => {
    if (token) {
      fetchFriends(token);
    }
  };

  // If no token, show login/signup screen
  if (!token) {
    return <Auth onLogin={handleLogin} />;
  }

  // If logged in, show main chat app
  return (
    <div>
      <TopBar currentUser={username} onLogout={handleLogout} />
      <div style={{ display: 'flex' }}>
        <SideBar token={token} friends={friends} onFriendsUpdated={handleFriendsUpdated} />
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
  userGreeting: {
    flex: 1,
    textAlign: 'center',
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
    width: '280px',
    background: '#f4f4f4',
    padding: '20px',
    minHeight: 'calc(100vh - 60px)',
    borderRight: '1px solid #ddd',
    overflowY: 'auto',
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
  friendName: {
    margin: 0,
    fontWeight: 'bold',
    fontSize: '14px',
  },
  friendUsername: {
    margin: '5px 0 0 0',
    fontSize: '12px',
    color: '#666',
  },
  noFriends: {
    color: '#888',
    fontStyle: 'italic',
    padding: '10px',
  },
  chatWindow: {
    flex: 1,
    padding: '20px',
    background: '#fff',
    minHeight: 'calc(100vh - 60px)',
  },
};

export default App;