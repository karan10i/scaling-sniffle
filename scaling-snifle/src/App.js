import React, { useState } from 'react';
import Auth from './components/Auth';
import './App.css';

// Encryption imports
import { 
  initializeOlm, 
  getIdentityKeys, 
  generateOneTimeKeys, 
  markKeysAsPublished,
  clearOlmData,
  isOlmInitialized
} from './services/encryption';
import {
  createOutboundSession,
  createInboundSession,
  hasSession,
  encryptMessage,
  decryptMessage,
  clearAllSessions
} from './services/olmSession';
import {
  encryptForVault,
  decryptFromVault,
  getOrCreateVaultKey
} from './services/vaultEncryption';

function TopBar({ currentUser, onLogout, onShowRequests }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '15px',
      background: '#333',
      color: 'white'
    }}>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <strong>User: {currentUser}</strong>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={onShowRequests} style={{ padding: '8px 12px', cursor: 'pointer' }}>
          Friend Requests
        </button>
        <button onClick={onLogout} style={{ padding: '8px 12px', cursor: 'pointer' }}>
          Logout
        </button>
      </div>
    </div>
  );
}

function SideBar({ friends, onSelectFriend, token, onFriendsUpdated }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await fetch(`http://localhost:8000/api/search-users/?q=${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const handleAddFriend = async (friendId) => {
    try {
      const res = await fetch('http://localhost:8000/api/send-request/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ to_user_id: friendId })
      });
      
      if (res.ok) {
        alert('Friend request sent!');
        setSearchQuery('');
        setSearchResults([]);
        setShowSearch(false);
      } else {
        const data = await res.json();
        alert(data.error || 'Error sending request');
      }
    } catch (err) {
      console.error('Add friend error:', err);
    }
  };

  return (
    <div style={{
      width: '250px',
      background: '#f4f4f4',
      padding: '10px',
      height: 'calc(100vh - 60px)',
      overflowY: 'auto'
    }}>
      <button 
        onClick={() => setShowSearch(!showSearch)}
        style={{
          width: '100%',
          padding: '10px',
          marginBottom: '10px',
          background: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        + Add Friend
      </button>

      {showSearch && (
        <div style={{ marginBottom: '15px', padding: '10px', background: '#fff', borderRadius: '4px' }}>
          <input
            type="text"
            placeholder="Search by username..."
            value={searchQuery}
            onChange={handleSearch}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              marginBottom: '10px',
              boxSizing: 'border-box'
            }}
          />
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {searchResults.map((user) => (
              <div key={user.id} style={{
                padding: '8px',
                background: '#e8f5e9',
                marginBottom: '8px',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <strong>{user.user_name}</strong>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#666' }}>@{user.username}</p>
                </div>
                <button
                  onClick={() => handleAddFriend(user.id)}
                  style={{
                    padding: '5px 10px',
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3>Friends ({friends ? friends.length : 0})</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {friends && friends.length > 0 ? (
          friends.map((friend) => (
            <li key={friend.id} onClick={() => onSelectFriend(friend)} 
              style={{
                padding: '10px',
                cursor: 'pointer',
                background: '#e0e0e0',
                margin: '5px 0',
                borderRadius: '4px'
              }}>
              {friend.user_name}
            </li>
          ))
        ) : (
          <li>No friends yet</li>
        )}
      </ul>
    </div>
  );
}

function ChatUI({ selectedFriend, token, username }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]); // Server-stored messages
  const [encryptionStatus, setEncryptionStatus] = useState('initializing');

  // Ensure encryption session exists with this friend
  const ensureEncryptionSession = React.useCallback(async () => {
    if (!selectedFriend || !isOlmInitialized()) {
      setEncryptionStatus('not-initialized');
      return false;
    }

    // Check if we already have a session
    if (hasSession(selectedFriend.id)) {
      setEncryptionStatus('ready');
      return true;
    }

    try {
      // Fetch friend's keys from server
      const res = await fetch(`http://localhost:8000/api/keys/query/${selectedFriend.username}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json();
        console.warn('Could not fetch friend keys:', data.error);
        setEncryptionStatus('no-keys');
        return false;
      }

      const keysData = await res.json();
      
      // Create outbound session
      createOutboundSession(
        selectedFriend.id,
        keysData.identityKey,
        keysData.oneTimeKey
      );

      setEncryptionStatus('ready');
      return true;
    } catch (err) {
      console.error('Failed to establish encryption session:', err);
      setEncryptionStatus('error');
      return false;
    }
  }, [selectedFriend, token]);

  // Initialize encryption session when friend is selected
  React.useEffect(() => {
    if (selectedFriend && token) {
      ensureEncryptionSession();
    }
  }, [selectedFriend, token, ensureEncryptionSession]);

  const fetchMessages = React.useCallback(async () => {
    if (selectedFriend && token) {
      try {
        const res = await fetch(`http://localhost:8000/api/get-messages/?user_id=${selectedFriend.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const rawMessages = data.messages || [];

        // Decrypt messages
        const decryptedMessages = await Promise.all(rawMessages.map(async (msg) => {
          try {
            // If message is from Redis (encrypted with Olm)
            if (msg.source === 'redis') {
              // Try to parse as encrypted JSON
              try {
                const encrypted = JSON.parse(msg.content);
                if (encrypted.type !== undefined && encrypted.body) {
                  // Determine the friendId based on who sent it
                  const friendId = msg.sender_id === selectedFriend.id 
                    ? selectedFriend.id 
                    : selectedFriend.id;
                  
                  // For incoming messages without session, create inbound session
                  if (encrypted.type === 0 && !hasSession(friendId)) {
                    // We need the sender's identity key for inbound session
                    // For now, try to fetch it
                    try {
                      const keysRes = await fetch(`http://localhost:8000/api/keys/query/${selectedFriend.username}/`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                      });
                      if (keysRes.ok) {
                        const keysData = await keysRes.json();
                        createInboundSession(friendId, keysData.identityKey, encrypted.body);
                      }
                    } catch (e) {
                      console.warn('Could not create inbound session:', e);
                    }
                  }

                  const plaintext = decryptMessage(friendId, encrypted.type, encrypted.body);
                  return { ...msg, content: plaintext };
                }
              } catch (parseErr) {
                // Not encrypted JSON, return as-is (legacy unencrypted message)
                return msg;
              }
            }
            
            // If message is from vault (encrypted with AES)
            if (msg.source === 'vault') {
              try {
                const plaintext = await decryptFromVault(msg.content);
                return { ...msg, content: plaintext };
              } catch (vaultErr) {
                console.warn('Vault decryption failed, showing raw content:', vaultErr.message);
                // Return the message as-is - it might be unencrypted legacy or from a different session
                return { ...msg, decryptionFailed: true };
              }
            }

            return msg;
          } catch (decryptErr) {
            console.error('Decryption error for message:', decryptErr);
            return { ...msg, content: '[Decryption failed]', decryptionFailed: true };
          }
        }));

        setMessages(decryptedMessages);
      } catch (err) {
        console.error('Fetch messages error:', err);
      }
    }
  }, [selectedFriend, token]);

  // Load messages when friend is selected
  React.useEffect(() => {
    if (selectedFriend && token) {
      fetchMessages();
    }
  }, [selectedFriend, token, fetchMessages]);

  const handleSendMessage = async () => {
    if (message.trim()) {
      try {
        let contentToSend = message;

        // Try to encrypt the message if encryption is ready
        if (encryptionStatus === 'ready' && hasSession(selectedFriend.id)) {
          try {
            const encrypted = encryptMessage(selectedFriend.id, message);
            contentToSend = JSON.stringify(encrypted);
            console.log('Message encrypted successfully');
          } catch (encryptErr) {
            console.warn('Encryption failed, sending unencrypted:', encryptErr);
            // Fall back to unencrypted message
          }
        } else {
          console.warn('Encryption not ready, sending unencrypted message');
        }

        const res = await fetch('http://localhost:8000/api/send-message/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            receiver_id: selectedFriend.id,
            content: contentToSend
          })
        });
        
        if (res.ok) {
          const data = await res.json();
          // Add message to state with decrypted content for display
          setMessages(prev => [...prev, {
            ...data.message_data,
            content: message // Show original plaintext in UI
          }]);
          setMessage("");
        } else {
          const data = await res.json();
          alert(data.error || 'Error sending message');
        }
      } catch (err) {
        console.error('Send message error:', err);
      }
    }
  };

  const handleSaveMessage = async (msg) => {
    try {
      // Determine if current user is sender or receiver
      const isSender = msg.sender_username === username;
      
      // Encrypt the message content for vault storage
      let vaultContent = msg.content;
      try {
        vaultContent = await encryptForVault(msg.content);
        console.log('Message encrypted for vault');
      } catch (vaultEncryptErr) {
        console.warn('Vault encryption failed, saving unencrypted:', vaultEncryptErr);
      }
      
      const res = await fetch('http://localhost:8000/api/save-to-vault/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          other_user_id: selectedFriend.id,
          content: vaultContent,
          is_sender: isSender
        })
      });
      
      if (res.ok) {
        // Update message to show it's saved without refresh
        setMessages(prev => prev.map(m => 
          m.content === msg.content && m.sender_id === msg.sender_id
            ? { ...m, is_saved: true, source: 'vault' }
            : m
        ));
      }
    } catch (err) {
      console.error('Save message error:', err);
    }
  };

  const handleDeleteMessage = (messageId) => {
    // Remove from state (will be cleaned up by server on logout)
    setMessages(prev => prev.filter(m => m.id !== messageId));
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: '#fff',
      height: 'calc(100vh - 60px)'
    }}>
      <div style={{ padding: '15px', background: '#e0e0e0', borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Chat with {selectedFriend.user_name}</h3>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '5px',
          fontSize: '12px',
          color: encryptionStatus === 'ready' ? '#4caf50' : '#ff9800'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: encryptionStatus === 'ready' ? '#4caf50' : '#ff9800'
          }}></span>
          {encryptionStatus === 'ready' ? '🔒 E2E Encrypted' : '⚠️ Unencrypted'}
        </div>
      </div>
      
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '15px',
        background: '#f9f9f9'
      }}>
        {messages.length > 0 ? (
          messages.map((msg) => (
            <div key={msg.id || `${msg.sender_id}-${msg.content}`} style={{
              marginBottom: '15px',
              padding: '10px',
              background: msg.sender_username === selectedFriend.username ? '#e3f2fd' : '#f1f8e9',
              borderRadius: '8px',
              textAlign: msg.sender_username === selectedFriend.username ? 'left' : 'right',
              border: msg.source === 'vault' ? '2px solid #4caf50' : '1px solid #ccc',
              opacity: msg.source === 'redis' ? 0.9 : 1
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <strong>{msg.sender_username === selectedFriend.username ? selectedFriend.user_name : 'You'}</strong>
                  <p style={{ margin: '5px 0' }}>{msg.content}</p>
                  <small style={{ color: '#666' }}>
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleString() : 'Just now'}
                    {msg.source === 'redis' && ' (Ephemeral)'}
                    {msg.source === 'vault' && ' (Saved)'}
                  </small>
                </div>
                <div style={{ display: 'flex', gap: '5px', marginLeft: '10px' }}>
                  {!msg.is_saved && msg.source === 'redis' && (
                    <button
                      onClick={() => handleSaveMessage(msg)}
                      style={{
                        padding: '5px 10px',
                        background: '#4caf50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      title="Save to vault (other user won't know)"
                    >
                      📌 Save
                    </button>
                  )}
                  {msg.source === 'redis' && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      style={{
                        padding: '5px 10px',
                        background: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      title="Delete (will disappear after 10 seconds anyway)"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p style={{ color: '#999' }}>No messages yet. Start the conversation!</p>
        )}
      </div>

      <div style={{
        padding: '15px',
        borderTop: '1px solid #ccc',
        display: 'flex',
        gap: '10px'
      }}>
        <input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          style={{
            flex: 1,
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
        <button onClick={handleSendMessage} style={{ padding: '10px 15px', cursor: 'pointer', background: '#2196f3', color: 'white', border: 'none', borderRadius: '4px' }}>
          Send
        </button>
      </div>
    </div>
  );
}

function FriendRequests({ token, onClose, onAccept }) {
  const [requests, setRequests] = React.useState([]);

  React.useEffect(() => {
    if (token) {
      fetch('http://localhost:8000/api/pending-requests/', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setRequests(data.requests || []))
        .catch(err => console.error(err));
    }
  }, [token]);

  const handleReject = async (requestId) => {
    try {
      const res = await fetch('http://localhost:8000/api/reject-request/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ request_id: requestId })
      });
      if (res.ok) {
        setRequests(requests.filter(r => r.request_id !== requestId));
      }
    } catch (err) {
      console.error('Reject error:', err);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      zIndex: 1000,
      maxWidth: '400px'
    }}>
      <h3>Friend Requests</h3>
      {requests.length > 0 ? (
        requests.map((req) => (
          <div key={req.request_id} style={{ padding: '10px', marginBottom: '10px', background: '#f0f0f0', borderRadius: '4px' }}>
            <p><strong>{req.user_name}</strong> wants to be your friend</p>
            <button onClick={() => onAccept(req.request_id)} style={{ marginRight: '10px', padding: '5px 10px', cursor: 'pointer', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>
              Accept
            </button>
            <button onClick={() => handleReject(req.request_id)} style={{ padding: '5px 10px', cursor: 'pointer', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}>
              Reject
            </button>
          </div>
        ))
      ) : (
        <p>No friend requests</p>
      )}
      <button onClick={onClose} style={{ marginTop: '15px', padding: '8px 12px', cursor: 'pointer' }}>
        Close
      </button>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState(null);
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [showRequests, setShowRequests] = useState(false);
  const [olmInitialized, setOlmInitialized] = useState(false);

  // Initialize encryption and upload keys after login
  const initializeEncryption = React.useCallback(async (authToken) => {
    try {
      // Initialize Olm
      await initializeOlm();
      console.log('Olm initialized successfully');

      // Get identity keys
      const identityKeys = getIdentityKeys();
      
      // Generate one-time keys
      const oneTimeKeys = generateOneTimeKeys(10);

      // Upload keys to server
      const res = await fetch('http://localhost:8000/api/keys/upload/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identityKey: identityKeys.identityKey,
          signingKey: identityKeys.signingKey,
          oneTimeKeys: oneTimeKeys
        })
      });

      if (res.ok) {
        markKeysAsPublished();
        console.log('Keys uploaded to server');
        setOlmInitialized(true);
      } else {
        console.warn('Failed to upload keys:', await res.json());
      }

      // Initialize vault key
      await getOrCreateVaultKey();
      console.log('Vault key ready');

    } catch (err) {
      console.error('Encryption initialization error:', err);
    }
  }, []);

  // Initialize encryption when token is set
  React.useEffect(() => {
    if (token) {
      initializeEncryption(token);
    }
  }, [token, initializeEncryption]);

  React.useEffect(() => {
    if (token) {
      fetch('http://localhost:8000/api/list-friends/', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setFriends(data.friends || []))
        .catch(err => console.error(err));
    }
  }, [token]);

  // Cleanup ephemeral messages when switching chats
  const previousFriendRef = React.useRef(null);

  React.useEffect(() => {
    // If we have a token and the selected friend changed from previous
    if (token && previousFriendRef.current && previousFriendRef.current.id !== selectedFriend?.id) {
      // Cleanup the previous friend's ephemeral messages
      fetch('http://localhost:8000/api/cleanup-ephemeral/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ friend_id: previousFriendRef.current.id })
      }).catch(err => console.error('Cleanup error:', err));
    }
    
    // Update the ref to current friend
    previousFriendRef.current = selectedFriend;
  }, [selectedFriend, token]);

  const handleAcceptRequest = (requestId) => {
    fetch('http://localhost:8000/api/accept-request/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ request_id: requestId })
    })
      .then(res => res.json())
      .then(() => {
        setShowRequests(false);
        // Refresh friends list
        fetch('http://localhost:8000/api/list-friends/', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => setFriends(data.friends || []));
      });
  };

  const handleLogout = () => {
    // Cleanup ephemeral messages for the last selected friend before logging out
    if (selectedFriend && token) {
      fetch('http://localhost:8000/api/cleanup-ephemeral/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ friend_id: selectedFriend.id })
      }).catch(err => console.error('Logout cleanup error:', err));
    }

    // Clear encryption data (but keep vault key for saved messages)
    clearAllSessions();
    clearOlmData();
    // Note: We intentionally don't clear vault key so saved messages 
    // can be decrypted on next login from the same browser
    setOlmInitialized(false);

    setToken(null);
    setUsername(null);
    setFriends([]);
    setSelectedFriend(null);
  };

  if (!token) {
    return <Auth onLogin={(t, u) => { setToken(t); setUsername(u); }} />;
  }

  return (
    <div>
      <TopBar currentUser={username} onLogout={handleLogout} onShowRequests={() => setShowRequests(true)} />
      <div style={{ display: 'flex' }}>
        <SideBar friends={friends} onSelectFriend={setSelectedFriend} token={token} onFriendsUpdated={() => {
          fetch('http://localhost:8000/api/list-friends/', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
            .then(res => res.json())
            .then(data => setFriends(data.friends || []));
        }} />
        {selectedFriend ? (
          <ChatUI selectedFriend={selectedFriend} token={token} username={username} />
        ) : (
          <div style={{ flex: 1, padding: '20px', background: '#fff' }}>
            <h2>Select a friend to chat</h2>
          </div>
        )}
      </div>
      {showRequests && <FriendRequests token={token} onClose={() => setShowRequests(false)} onAccept={handleAcceptRequest} />}
    </div>
  );
}

export default App;