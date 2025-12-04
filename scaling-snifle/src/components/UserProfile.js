import React, { useState, useEffect } from 'react';

export default function UserProfile({ token }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/profile/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setProfile(data);
    } catch (err) {
      console.error('Profile fetch error:', err);
    }
    setLoading(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={styles.container}>
      <h4>{profile?.user_name}</h4>
      <p style={styles.subtitle}>@{profile?.username}</p>
      <p style={styles.friendCount}>👥 {profile?.friend_count} Friends</p>
    </div>
  );
}

const styles = {
  container: {
    padding: '15px',
    background: '#f9f9f9',
    borderRadius: '5px',
    marginBottom: '15px',
  },
  subtitle: {
    margin: '5px 0',
    color: '#666',
    fontSize: '12px',
  },
  friendCount: {
    margin: '10px 0 0 0',
    fontWeight: 'bold',
    color: '#333',
  },
};
