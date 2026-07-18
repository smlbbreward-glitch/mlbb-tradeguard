import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiLogin, apiMe } from '../utils/api';
import '../styles/Auth.css';

export default function Login({ setCurrentUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [storageWarning, setStorageWarning] = useState('');
  const navigate = useNavigate();

  React.useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => {
        if (d.storage !== 'persistent') {
          setStorageWarning('ephemeral');
        }
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsError(false);
    setLoading(true);

    try {
      const { token, user } = await apiLogin(username, password);
      localStorage.setItem('authToken', token);
      let fullUser = user;
      try { fullUser = await apiMe(); } catch {}
      setCurrentUser(fullUser);
      navigate('/marketplace');
    } catch (error) {
      setIsError(true);
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {storageWarning === 'ephemeral' && (
        <div style={{
          maxWidth: '400px',
          margin: '0 auto 16px',
          padding: '14px',
          borderRadius: '14px',
          background: 'rgba(255,170,0,0.12)',
          border: '1px solid rgba(255,170,0,0.5)',
          color: '#ffd666',
          fontSize: '13px',
          textAlign: 'center',
          lineHeight: 1.5
        }}>
          ⚠️ <strong>Ephemeral storage detected.</strong> User accounts are saved in temporary memory and may disappear after server restarts.<br />
          To make accounts <strong>permanent</strong>, connect <strong>Vercel KV</strong> in your Vercel dashboard (Storage → Create Database → KV).
        </div>
      )}
      <form onSubmit={handleLogin} className={`auth-card ${isError ? 'shake' : ''}`}>
        <h2 style={{ fontFamily: "'Cinzel', serif", color: '#ffd666', textAlign: 'center', textShadow: '0 0 20px rgba(255,215,0,0.3)' }}>Login</h2>
        {isError && <p style={{ color: '#ff7b7b', textAlign: 'center', fontSize: '14px' }}>⚠️ Incorrect credentials!</p>}
        <input 
          className="auth-input" 
          type="text" 
          placeholder="Username" 
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
        />
        <input 
          className="auth-input" 
          type="password" 
          placeholder="Password" 
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
