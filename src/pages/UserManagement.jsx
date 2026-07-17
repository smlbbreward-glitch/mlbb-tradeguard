import React, { useMemo, useState } from 'react';
import '../styles/Auth.css';
import { apiPromoteUser, apiDeleteUser } from '../utils/api';

export default function UserManagement({ currentUser, userAccounts, setCurrentUser, deleteUserAccount, middlemanUsers, setMiddlemanUsers, data }) {
  const [searchTerm, setSearchTerm] = useState('');
  const accounts = userAccounts || [];

  const filteredAccounts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return accounts;
    return accounts.filter((account) => account.username.toLowerCase().includes(term));
  }, [searchTerm, accounts]);

  const handlePromote = async (username) => {
    try {
      await apiPromoteUser(username);
      await data.refresh();
    } catch (e) { alert(e.message); }
  };

  const handleDelete = async (usernameToDelete) => {
    try {
      await apiDeleteUser(usernameToDelete);
      deleteUserAccount(usernameToDelete);
      await data.refresh();
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '900px', textAlign: 'left' }}>
        <h1 style={{ fontFamily: "'Cinzel', serif", color: '#ffd666', textShadow: '0 0 20px rgba(255,215,0,0.3)', marginBottom: '8px' }}>User Management</h1>
        <p style={{ color: '#9a9ab0', marginBottom: '20px' }}>Search all registered users, remove them, and promote selected users as middlemen.</p>

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
