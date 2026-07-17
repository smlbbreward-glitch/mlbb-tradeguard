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
      <div className="auth-card" style={{ maxWidth: '900px', textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontFamily: "'Cinzel', serif", color: '#ffd666', textShadow: '0 0 20px rgba(255,215,0,0.3)', marginBottom: '6px' }}>Transaction History</h1>
            <p style={{ color: '#9a9ab0', margin: 0 }}>Completed and cancelled trades are recorded here.</p>
          </div>
          <Link to="/profile" className="auth-button" style={{ display: 'inline-block', textDecoration: 'none', color: '#000', width: 'auto' }}>
            Back to Profile
          </Link>
        </div>

        <div style={{ display: 'grid', gap: '16px' }}>
          <div className="auth-card" style={{ background: 'rgba(10,15,30,0.6)', padding: '16px', borderRadius: '16px' }}>
            <h3 style={{ fontFamily: "'Cinzel', serif", color: '#4caf50', marginBottom: '10px' }}>Successful Trades</h3>
            {successfulTrades.length === 0 ? (
              <p style={{ color: '#a0b4c8' }}>No successful trades recorded yet.</p>
            ) : successfulTrades.map((entry) => (
              <div key={entry.id} className="auth-card" style={{ marginBottom: '10px', textAlign: 'left' }}>
                <p><strong style={{ color: '#ffd666' }}>{entry.caption}</strong></p>
                <p style={{ color: '#a0b4c8' }}>Buyer: {entry.buyer} | Seller: {entry.seller}</p>
                <p style={{ color: '#a0b4c8' }}>Price: {entry.price} | Midman: {entry.midman}</p>
                {entry.premium && <p style={{ color: '#ffd666' }}>Premium: ⭐ Yes (Midman fee waived)</p>}
                {!entry.premium && entry.midmanFee > 0 && <p style={{ color: '#ff9800' }}>Midman Fee: {entry.midmanFee} credits</p>}
                <p>Status: <span style={{ color: '#4caf50', fontWeight: '700' }}>{entry.status}</span></p>
                <p style={{ color: '#9a9ab0', fontSize: '13px' }}>Closed by {entry.closedBy} on {entry.closedAt}</p>
              </div>
            ))}
          </div>

          <div className="auth-card" style={{ background: 'rgba(10,15,30,0.6)', padding: '16px', borderRadius: '16px' }}>
            <h3 style={{ fontFamily: "'Cinzel', serif", color: '#ff4d4f', marginBottom: '10px' }}>Cancelled Trades</h3>
            {cancelledTrades.length === 0 ? (
              <p style={{ color: '#a0b4c8' }}>No cancelled trades recorded yet.</p>
            ) : cancelledTrades.map((entry) => (
              <div key={entry.id} className="auth-card" style={{ marginBottom: '10px', textAlign: 'left' }}>
                <p><strong style={{ color: '#ffd666' }}>{entry.caption}</strong></p>
                <p style={{ color: '#a0b4c8' }}>Buyer: {entry.buyer} | Seller: {entry.seller}</p>
                <p style={{ color: '#a0b4c8' }}>Price: {entry.price} | Midman: {entry.midman}</p>
                {entry.premium && <p style={{ color: '#ffd666' }}>Premium: ⭐ Yes (Midman fee waived)</p>}
                {!entry.premium && entry.midmanFee > 0 && <p style={{ color: '#ff9800' }}>Midman Fee: {entry.midmanFee} credits</p>}
                <p>Status: <span style={{ color: '#ff4d4f', fontWeight: '700' }}>{entry.status}</span></p>
                <p style={{ color: '#9a9ab0', fontSize: '13px' }}>Closed by {entry.closedBy} on {entry.closedAt}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
