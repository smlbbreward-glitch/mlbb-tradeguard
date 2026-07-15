import React from 'react';
import '../styles/Auth.css';

export default function Home() {
  return (
    <div className="auth-container">
      <h1 style={{ color: '#ffcc00', fontSize: '48px', marginBottom: '20px' }}>
        Welcome to MLBB Grab
      </h1>
      <p style={{ color: '#aaa', fontSize: '20px', maxWidth: '600px', textAlign: 'center' }}>
        The secure ecosystem built specifically for verified Mobile Legends players to showcase achievements and exchange accounts safely.
      </p>
    </div>
  );
}