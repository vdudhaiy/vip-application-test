// FIX: Page redirect unauthorised (not logged in) users to the / page but there's no error message.
import React, { useState, useEffect } from 'react';
import API_ENDPOINTS from '../config/api';
import { useAuth } from '../components/UserAuth';
import { useNavigate } from 'react-router-dom';

const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  const [editUsername, setEditUsername] = useState(user?.username || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [updateMessage, setUpdateMessage] = useState('');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    const res = await fetch(API_ENDPOINTS.CHANGE_PASSWORD, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${token}`,
      },
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });

    if (res.ok) {
      setPasswordMessage('✅ Password changed successfully.');
      setOldPassword('');
      setNewPassword('');
      setTimeout(() => {
        setShowPasswordForm(false);
        setPasswordMessage('');
      }, 1500);
    } else {
      setPasswordMessage('❌ Failed to change password.');
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    const res = await fetch(API_ENDPOINTS.UPDATE_PROFILE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${token}`,
      },
      body: JSON.stringify({ username: editUsername, email: editEmail }),
    });

    if (res.ok) {
      setUpdateMessage('✅ Profile updated.');
      setTimeout(() => {
        setShowUpdateForm(false);
        setUpdateMessage('');
      }, 1500);
    } else {
      setUpdateMessage('❌ Failed to update profile.');
    }
  };

  if (!user) return <p style={{ color: '#E0E0E0', textAlign: 'center' }}>Loading user profile...</p>;

  return (
    <div style={{
      backgroundColor: 'rgb(30, 30, 30)',
      color: '#E0E0E0',
      padding: '32px',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2 style={{ marginBottom: '16px' }}>Profile</h2>

      {!showUpdateForm && (
        <>
          <p><strong>Username:</strong> {user.username}</p>
          <p><strong>Email:</strong> {user.email}</p>
        </>
      )}

      <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => {
            setShowPasswordForm(!showPasswordForm);
            setShowUpdateForm(false);
          }}
          style={{
            backgroundColor: '#444',
            color: '#E0E0E0',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            marginTop: '20px',
            cursor: 'pointer'
          }}
        >
          {showPasswordForm ? 'Cancel' : 'Change Password'}
        </button>

        <button
          onClick={() => {
            setShowUpdateForm(!showUpdateForm);
            setShowPasswordForm(false);
          }}
          style={{
            backgroundColor: '#888',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            marginTop: '20px',
            cursor: 'pointer'
          }}
        >
          {showUpdateForm ? 'Cancel' : 'Update Profile'}
        </button>

        <button
          onClick={() => {
            logout();
            navigate('/', { state: { message: 'You have been logged out.' } });
          }}
          style={{
            backgroundColor: '#aa0000',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            marginTop: '20px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>

      </div>

      {showPasswordForm && (
        <form onSubmit={handlePasswordChange} style={{ marginTop: '20px', maxWidth: '400px' }}>
          <h4>Change Password</h4>
          <input
            type="password"
            placeholder="Old Password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            style={inputStyle}
          />
          <button type="submit" style={buttonStyle}>Submit</button>
          {passwordMessage && <p style={{ marginTop: '10px' }}>{passwordMessage}</p>}
        </form>
      )}

      {showUpdateForm && (
        <form onSubmit={handleProfileUpdate} style={{ marginTop: '20px', maxWidth: '400px' }}>
          <h4>Edit Profile</h4>
          <input
            type="text"
            placeholder="Username"
            value={editUsername}
            onChange={(e) => setEditUsername(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="email"
            placeholder="Email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <button type="submit" style={buttonStyle}>Save Changes</button>
          {updateMessage && <p style={{ marginTop: '10px' }}>{updateMessage}</p>}
        </form>
      )}
    </div>
  );
};

const inputStyle = {
  width: '100%',
  padding: '10px',
  marginBottom: '10px',
  borderRadius: '4px',
  border: '1px solid #555',
  backgroundColor: '#3C3C3C',
  color: '#E0E0E0'
};

const buttonStyle = {
  backgroundColor: '#2C2C2C',
  color: '#E0E0E0',
  padding: '8px 16px',
  border: '1px solid #555',
  borderRadius: '4px',
  cursor: 'pointer'
};

export default ProfilePage;
