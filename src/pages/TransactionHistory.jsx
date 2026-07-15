import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Auth.css';

export default function TransactionHistory({ currentUser, transactionHistory }) {
  const visibleHistory = useMemo(() => {
    if (!currentUser) return [];

    return transactionHistory.filter((entry) => {
      if (currentUser.role === 'developer') return true;
      const username = currentUser.username?.toLowerCase();
      return (
        entry.buyer?.toLowerCase() === username ||
        entry.seller?.toLowerCase() === username ||
        entry.midman?.toLowerCase() === username
      );
    });
  }, [currentUser, transactionHistory]);

  const successfulTrades = visibleHistory.filter((entry) => entry.status === 'Success');
  const cancelledTrades = visibleHistory.filter((entry) => entry.status === 'Cancelled');

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div>
            <h1 style={{ color: '#ffcc00', marginBottom: '6px' }}>Transaction History</h1>
            <p style={{ color: '#9eb0d5', margin: 0 }}>Completed and cancelled trades are recorded here.</p>
          </div>
          <Link to="/profile" className="auth-button" style={{ display: 'inline-block', textDecoration: 'none', color: '#000' }}>
            Back to Profile
          </Link>
        </div>

        <div style={{ display: 'grid', gap: '16px' }}>
          <div style={{ background: '#161622', padding: '16px', borderRadius: '10px' }}>
            <h3 style={{ color: '#4caf50', marginBottom: '10px' }}>Successful Trades</h3>
            {successfulTrades.length === 0 ? (
              <p>No successful trades recorded yet.</p>
            ) : successfulTrades.map((entry) => (
              <div key={entry.id} style={{ background: '#0f1428', padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
                <p><strong>{entry.caption}</strong></p>
                <p>Buyer: {entry.buyer} | Seller: {entry.seller}</p>
                <p>Price: {entry.price} | Midman: {entry.midman}</p>
                <p>Status: <span style={{ color: '#4caf50', fontWeight: '700' }}>{entry.status}</span></p>
                <p style={{ color: '#9eb0d5', fontSize: '13px' }}>Closed by {entry.closedBy} on {entry.closedAt}</p>
              </div>
            ))}
          </div>

          <div style={{ background: '#161622', padding: '16px', borderRadius: '10px' }}>
            <h3 style={{ color: '#ff4d4f', marginBottom: '10px' }}>Cancelled Trades</h3>
            {cancelledTrades.length === 0 ? (
              <p>No cancelled trades recorded yet.</p>
            ) : cancelledTrades.map((entry) => (
              <div key={entry.id} style={{ background: '#0f1428', padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
                <p><strong>{entry.caption}</strong></p>
                <p>Buyer: {entry.buyer} | Seller: {entry.seller}</p>
                <p>Price: {entry.price} | Midman: {entry.midman}</p>
                <p>Status: <span style={{ color: '#ff4d4f', fontWeight: '700' }}>{entry.status}</span></p>
                <p style={{ color: '#9eb0d5', fontSize: '13px' }}>Closed by {entry.closedBy} on {entry.closedAt}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
