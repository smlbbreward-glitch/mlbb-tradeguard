import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRegister } from '../utils/api';
import '../styles/Auth.css';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username || !password) {
      setError('⚠️ All fields are required!');
      setLoading(false);
      return;
    }

    if (username.trim().length < 3) {
      setError('⚠️ Username must be at least 3 characters long.');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('⚠️ Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    try {
      await apiRegister(username, password);
      alert('✅ Account created successfully! Please log in.');
      navigate('/login');
    } catch (err) {
      console.error(err);
      setError(err.message || '⚠️ Could not create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleRegister} className="auth-card">
        <h2 style={{ fontFamily: "'Cinzel', serif", color: '#ffd666', textAlign: 'center', textShadow: '0 0 20px rgba(255,215,0,0.3)', marginBottom: '20px' }}>Create MLBB Buy Account</h2>
        {error && <p style={{ color: '#ff7b7b', fontSize: '14px' }}>{error}</p>}

        <input
          className="auth-input"
          type="text"
          placeholder="Choose Username"
          onChange={(e) => setUsername(e.target.value)}
          required
          disabled={loading}
        />

        <input
          className="auth-input"
          type="password"
          placeholder="Choose Password"
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />

        <button type="submit" className="auth-button" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
          {loading ? 'Creating Account...' : 'Register Now'}
        </button>

        <p style={{ marginTop: '15px', fontSize: '14px', color: '#a0b4c8' }}>
          Already have an account? <a href="/login" style={{ color: '#00d4ff', textDecoration: 'none', fontWeight: 600 }}>Sign In</a>
        </p>
      </form>
    </div>
  );
}

