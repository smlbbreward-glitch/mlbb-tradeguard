import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Auth.css';

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export default function Register({ setRegisteredUser, setUserAccounts }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      setError('⚠️ All fields are required!');
      return;
    }

    if (username.trim().length < 3) {
      setError('⚠️ Username must be at least 3 characters long.');
      return;
    }

    if (password.length < 8) {
      setError('⚠️ Password must be at least 8 characters long.');
      return;
    }

    const savedCooldowns = JSON.parse(localStorage.getItem('cooldownData') || '{}');
    const previousEntry = savedCooldowns[username];

    if (previousEntry && previousEntry.cooldownUntil > Date.now()) {
      const waitTime = Math.ceil((previousEntry.cooldownUntil - Date.now()) / 60000);
      setError(`⚠️ This account was declined. Please wait ${waitTime} minutes before registering again.`);
      return;
    }

    try {
      const ip = 'test-ip-bypass';
      const ipAttempts = JSON.parse(localStorage.getItem('ipAttempts') || '{}');
      const currentAttempts = (ipAttempts[ip] || []).filter((item) => Date.now() - item.timestamp < COOLDOWN_MS);

      currentAttempts.push({ username, timestamp: Date.now() });
      ipAttempts[ip] = currentAttempts;
      localStorage.setItem('ipAttempts', JSON.stringify(ipAttempts));

      const newUser = { username, password, isVerified: false, verificationStatus: 'not_started', ip, createdAt: Date.now() };
      setRegisteredUser(newUser);
      setUserAccounts((prev) => {
        const filtered = prev.filter((account) => account.username.toLowerCase() !== username.toLowerCase());
        return [...filtered, newUser];
      });
      alert('✅ Account created successfully! Please log in.');
      navigate('/login');
    } catch (err) {
      console.error(err);
      setError('⚠️ Could not create account. Please try again.');
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleRegister} className="auth-card">
        <h2 style={{ color: '#ffcc00', marginBottom: '20px' }}>Create MLBB Grab Account</h2>
        {error && <p style={{ color: '#ff4444', fontSize: '14px' }}>{error}</p>}
        
        <input 
          className="auth-input" 
          type="text" 
          placeholder="Choose Username" 
          onChange={(e) => setUsername(e.target.value)} 
          required 
        />
        
        <input 
          className="auth-input" 
          type="password" 
          placeholder="Choose Password" 
          onChange={(e) => setPassword(e.target.value)} 
          required 
        />
        
        <button type="submit" className="auth-button" style={{ width: '100%', marginTop: '10px' }}>
          Register Now
        </button>
        
        <p style={{ marginTop: '15px', fontSize: '14px' }}>
          Already have an account? <a href="/login" style={{ color: '#ffcc00' }}>Sign In</a>
        </p>
      </form>
    </div>
  );
}