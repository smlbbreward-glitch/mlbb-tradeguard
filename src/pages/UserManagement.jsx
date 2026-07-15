import React, { useMemo, useState } from 'react';

export default function UserManagement({ userAccounts, setUserAccounts, setCurrentUser, deleteUserAccount, middlemanUsers, setMiddlemanUsers }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAccounts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return userAccounts;

    return userAccounts.filter((account) => account.username.toLowerCase().includes(term));
  }, [searchTerm, userAccounts]);

  const handleDelete = (usernameToDelete) => {
    deleteUserAccount(usernameToDelete);
    setUserAccounts((prev) => prev.filter((account) => account.username.toLowerCase() !== usernameToDelete.toLowerCase()));
    setCurrentUser((prev) => (prev?.username?.toLowerCase() === usernameToDelete.toLowerCase() ? null : prev));
  };

  return (
    <div style={{ padding: '40px', color: '#fff', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '8px' }}>User Management</h1>
      <p style={{ color: '#9eb0d5', marginBottom: '20px' }}>Search all registered users, remove them, and promote selected users as middlemen.</p>

      <div style={{ background: '#161622', padding: '20px', borderRadius: '12px' }}>
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search users by username"
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #2f3550', background: '#0f1428', color: '#fff' }}
        />

        <div style={{ marginTop: '16px' }}>
          {filteredAccounts.length === 0 ? (
            <p>No users found.</p>
          ) : (
            <ul style={{ paddingLeft: '18px', margin: 0 }}>
              {filteredAccounts.map((account) => (
                <li key={account.username} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span>
                      <strong>{account.username}</strong> — Password: {account.password}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setMiddlemanUsers((prev) => (prev.includes(account.username.toLowerCase()) ? prev : [...prev, account.username.toLowerCase()]))}
                        style={{ background: '#ffcc00', color: '#000', padding: '6px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                      >
                        {middlemanUsers.includes(account.username.toLowerCase()) ? 'Middleman' : 'Promote'}
                      </button>
                      <button
                        onClick={() => handleDelete(account.username)}
                        style={{ background: '#ff4d4f', color: '#fff', padding: '6px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
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
  );
}
