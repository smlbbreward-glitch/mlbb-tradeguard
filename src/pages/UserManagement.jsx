import React, { useMemo, useState, useEffect, useRef } from 'react';
import '../styles/Auth.css';
import { apiPromoteUser, apiDeleteUser } from '../utils/api';

export default function UserManagement({ currentUser, userAccounts, setCurrentUser, deleteUserAccount, middlemanUsers, setMiddlemanUsers, data }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [revealed, setRevealed] = useState({});
  const accounts = userAccounts || [];
  const pollTimer = useRef(null);

  useEffect(() => {
    if (!data.refreshUsers) return;
    data.refreshUsers();
    pollTimer.current = setInterval(() => {
      data.refreshUsers();
    }, 4000);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [data.refreshUsers]);

  const filteredAccounts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return accounts;
    return accounts.filter((account) => account.username.toLowerCase().includes(term));
  }, [searchTerm, accounts]);

  const handlePromote = async (username) => {
    try {
      await apiPromoteUser(username);
      if (data.refreshUsers) await data.refreshUsers();
    } catch (e) { alert(e.message); }
  };

  const handleDelete = async (usernameToDelete) => {
    try {
      await apiDeleteUser(usernameToDelete);
      deleteUserAccount(usernameToDelete);
      if (data.refreshUsers) await data.refreshUsers();
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '900px', textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
          <h1 style={{ fontFamily: "'Cinzel', serif", color: '#ffd666', textShadow: '0 0 20px rgba(255,215,0,0.3)', margin: 0 }}>User Management</h1>
          <button onClick={() => data.refreshUsers()} className="auth-button" style={{ width: 'auto', background: 'linear-gradient(135deg, #00d4ff, #0099cc)' }}>
            Refresh Users
          </button>
        </div>
        <p style={{ color: '#9a9ab0', marginBottom: '20px' }}>Total accounts: <strong style={{ color: '#ffd666' }}>{accounts.length}</strong>. List updates live every few seconds. Search, promote, or remove users.</p>

        <div className="auth-card" style={{ background: 'rgba(10,15,30,0.6)', padding: '20px', borderRadius: '16px' }}>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users by username"
            className="auth-input"
            style={{ width: '100%' }}
          />

          <div style={{ marginTop: '16px' }}>
            {filteredAccounts.length === 0 ? (
              <p style={{ color: '#a0b4c8' }}>No users found.</p>
            ) : (
              <ul style={{ paddingLeft: '18px', margin: 0 }}>
                {filteredAccounts.map((account) => (
                  <li key={account.username} style={{ marginBottom: '12px', color: '#e6e6f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span>
                        <strong style={{ color: '#ffd666' }}>{account.username}</strong> — {account.role}
                        <span style={{ marginLeft: '10px', color: '#9a9ab0', fontSize: '13px' }}>
                          {revealed[account.username] ? (account.password || '(no password set)') : '••••••••'}
                          <button
                            onClick={() => setRevealed((prev) => ({ ...prev, [account.username]: !prev[account.username] }))}
                            style={{ marginLeft: '6px', background: 'none', border: '1px solid rgba(0,212,255,0.4)', color: '#00d4ff', borderRadius: '6px', cursor: 'pointer', padding: '1px 8px', fontSize: '12px' }}
                          >
                            {revealed[account.username] ? 'Hide' : 'Show'}
                          </button>
                        </span>
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handlePromote(account.username)}
                          className="auth-button"
                          style={{ width: 'auto', background: middlemanUsers.includes(account.username.toLowerCase()) || account.role === 'middleman' ? '#666' : 'linear-gradient(135deg, #ffd666, #ffaa00)' }}
                        >
                          {middlemanUsers.includes(account.username.toLowerCase()) || account.role === 'middleman' ? 'Middleman' : 'Promote'}
                        </button>
                        <button
                          onClick={() => handleDelete(account.username)}
                          className="auth-button"
                          style={{ width: 'auto', background: 'linear-gradient(135deg, #c62828, #b71c1c)' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
