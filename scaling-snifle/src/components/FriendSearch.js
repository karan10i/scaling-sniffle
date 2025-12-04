import React, { useState } from 'react';

export default function FriendSearch({ token, onFriendAdded }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    const searchTerm = e.target.value;
    setQuery(searchTerm);

    if (searchTerm.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/search-users/?q=${searchTerm}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Search error:', err);
    }
    setLoading(false);
  };

  const handleAddFriend = async (friendId, friendName) => {
    try {
      const res = await fetch('http://localhost:8000/api/add-friend/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ friend_id: friendId }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(`Added ${friendName} as friend!`);
        setResults([]);
        setQuery('');
        onFriendAdded();
      } else {
        alert(data.error || 'Error adding friend');
      }
    } catch (err) {
      console.error('Add friend error:', err);
    }
  };

  return (
    <div style={styles.container}>
      <input
        type="text"
        placeholder="Search by username or profile name"
        value={query}
        onChange={handleSearch}
        style={styles.searchInput}
      />

      {loading && <p>Loading...</p>}

      {results.length > 0 && (
        <div style={styles.resultsList}>
          {results.map((user) => (
            <div key={user.id} style={styles.resultItem}>
              <div>
                <p style={styles.username}>{user.user_name}</p>
                <p style={styles.subtitle}>@{user.username}</p>
              </div>
              <button
                onClick={() => handleAddFriend(user.id, user.user_name)}
                style={styles.addButton}
              >
                Add
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    marginBottom: '20px',
  },
  searchInput: {
    width: '100%',
    padding: '10px',
    marginBottom: '10px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  resultsList: {
    border: '1px solid #ddd',
    borderRadius: '5px',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  resultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    borderBottom: '1px solid #eee',
    background: '#fff',
  },
  username: {
    margin: 0,
    fontWeight: 'bold',
  },
  subtitle: {
    margin: '5px 0 0 0',
    fontSize: '12px',
    color: '#666',
  },
  addButton: {
    padding: '6px 12px',
    background: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
};
