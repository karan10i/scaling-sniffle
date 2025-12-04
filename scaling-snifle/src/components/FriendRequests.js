import React, { useState, useEffect } from 'react';

export default function FriendRequests({ token, onRequestAction }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, [token]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/pending-requests/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Fetch requests error:', err);
    }
    setLoading(false);
  };

  const handleAccept = async (requestId) => {
    try {
      const res = await fetch('http://localhost:8000/api/accept-request/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ request_id: requestId }),
      });

      if (res.ok) {
        alert('Friend request accepted!');
        fetchRequests();
        onRequestAction();
      } else {
        const data = await res.json();
        alert(data.error || 'Error accepting request');
      }
    } catch (err) {
      console.error('Accept error:', err);
    }
  };

  const handleReject = async (requestId) => {
    try {
      const res = await fetch('http://localhost:8000/api/reject-request/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ request_id: requestId }),
      });

      if (res.ok) {
        alert('Friend request rejected');
        fetchRequests();
      } else {
        const data = await res.json();
        alert(data.error || 'Error rejecting request');
      }
    } catch (err) {
      console.error('Reject error:', err);
    }
  };

  if (loading) return <div style={styles.container}>Loading...</div>;

  if (requests.length === 0) {
    return <div style={styles.container}></div>;
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>📥 Friend Requests ({requests.length})</h3>
      <div style={styles.requestsList}>
        {requests.map((req) => (
          <div key={req.request_id} style={styles.requestItem}>
            <div>
              <p style={styles.name}>{req.user_name}</p>
              <p style={styles.username}>@{req.username}</p>
            </div>
            <div style={styles.buttons}>
              <button
                onClick={() => handleAccept(req.request_id)}
                style={styles.acceptButton}
              >
                ✓ Accept
              </button>
              <button
                onClick={() => handleReject(req.request_id)}
                style={styles.rejectButton}
              >
                ✗ Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    marginBottom: '20px',
  },
  title: {
    margin: '0 0 10px 0',
    fontSize: '14px',
    color: '#333',
  },
  requestsList: {
    border: '1px solid #ddd',
    borderRadius: '5px',
    background: '#fff',
  },
  requestItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    borderBottom: '1px solid #eee',
  },
  name: {
    margin: 0,
    fontWeight: 'bold',
    fontSize: '14px',
  },
  username: {
    margin: '5px 0 0 0',
    fontSize: '12px',
    color: '#666',
  },
  buttons: {
    display: 'flex',
    gap: '8px',
  },
  acceptButton: {
    padding: '6px 10px',
    background: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  rejectButton: {
    padding: '6px 10px',
    background: '#dc3545',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
};
