import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Auth.css';

export default function Login({ registeredUser, setCurrentUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isError, setIsError] = useState(false);
  const navigate = useNavigate();

  const developerAccounts = [
    { username: 'chrisford', password: 'chrisford' },
    { username: 'devadmin', password: 'devadmin' },
    { username: 'developer01', password: 'developer01' }
  ];

  const handleLogin = (e) => {
    e.preventDefault();

    const normalizedUsername = username.trim().toLowerCase();
    const matchingDeveloperAccount = developerAccounts.find(
      (account) => account.username.toLowerCase() === normalizedUsername && account.password === password
    );

    if (matchingDeveloperAccount) {
      const developerUser = {
        username: matchingDeveloperAccount.username,
        password: matchingDeveloperAccount.password,
        isVerified: true,
        verificationStatus: 'approved',
        role: 'developer'
      };

      setCurrentUser(developerUser);
      navigate('/marketplace');
      return;
    }

    if (registeredUser && registeredUser.username === username && registeredUser.password === password) {
      const signedInUser = {
        ...registeredUser,
        verificationStatus: registeredUser.isVerified ? 'approved' : registeredUser.verificationStatus || 'required'
      };

      setCurrentUser(signedInUser);

      if (!signedInUser.isVerified) {
        alert('⚠️ Verify your account before you can sell. You cannot post listings until verification is approved.');
      }

      navigate('/marketplace');
      return;
    }

    setIsError(true);
    setTimeout(() => setIsError(false), 500);
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleLogin} className={`auth-card ${isError ? 'shake' : ''}`}>
        <h2 style={{ color: '#fff', textAlign: 'center' }}>Login</h2>
        {isError && <p style={{ color: '#ff4444', textAlign: 'center', fontSize: '14px' }}>⚠️ Incorrect credentials!</p>}
        <input className="auth-input" type="text" placeholder="Username" onChange={(e) => setUsername(e.target.value)} />
        <input className="auth-input" type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" className="auth-button">Sign In</button>

        <div style={{ marginTop: '12px', color: '#d7e0ff', fontSize: '13px' }}>
          <p style={{ marginBottom: '6px' }}>Developer accounts:</p>
          <ul style={{ paddingLeft: '18px', margin: 0 }}>
            {developerAccounts.map((account) => (
              <li key={account.username}>
                <strong>{account.username}</strong> / {account.password}
              </li>
            ))}
          </ul>
        </div>
      </form>
    </div>
  );
}