import React from 'react';
import '../styles/Auth.css';

export default function Reports() {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 style={{ fontFamily: "'Cinzel', serif", color: '#ffd666', textShadow: '0 0 20px rgba(255,215,0,0.3)' }}>🛡 Scam Reports</h1>
        <p style={{ color: '#9a9ab0', marginTop: '10px' }}>Search scam history and submit reports.</p>
      </div>
    </div>
  );
}
