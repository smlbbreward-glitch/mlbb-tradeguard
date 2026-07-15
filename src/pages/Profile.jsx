import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Auth.css';

export default function Profile({ user, marketplacePosts, setMarketplacePosts, transactionHistory }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ caption: '', price: '', rank: '', mlId: '', serverId: '', securityLock: '' });

  const myPosts = useMemo(() => {
    if (!user) return [];
    return marketplacePosts.filter((post) => post.seller?.toLowerCase() === user.username?.toLowerCase());
  }, [marketplacePosts, user]);

  const myTransactions = useMemo(() => {
    if (!user || !transactionHistory) return [];

    return transactionHistory.filter((entry) => {
      const username = user.username?.toLowerCase();
      return (
        entry.buyer?.toLowerCase() === username ||
        entry.seller?.toLowerCase() === username ||
        entry.midman?.toLowerCase() === username
      );
    });
  }, [transactionHistory, user]);

  const successfulTrades = myTransactions.filter((entry) => entry.status === 'Success');
  const cancelledTrades = myTransactions.filter((entry) => entry.status === 'Cancelled');

  if (!user) return <div className="auth-container"><h2>Please log in to view your profile.</h2></div>;

  const startEdit = (post) => {
    setEditingId(post.id);
    setEditForm({
      caption: post.caption || '',
      price: post.price || '',
      rank: post.rank || '',
      mlId: post.mlId || '',
      serverId: post.serverId || '',
      securityLock: post.securityLock || ''
    });
  };

  const saveEdit = (postId) => {
    setMarketplacePosts((prev) => prev.map((post) => (post.id === postId ? { ...post, ...editForm } : post)));
    setEditingId(null);
  };

  const deletePost = (postId) => {
    setMarketplacePosts((prev) => prev.filter((post) => post.id !== postId));
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 style={{ color: '#ffcc00' }}>My Profile</h1>
        <p style={{ fontSize: '18px', margin: '15px 0' }}>
          <strong>Username:</strong> {user.username}
        </p>

        {user.isVerified ? (
          <div style={{ color: '#4caf50', margin: '20px 0', padding: '10px', border: '1px solid #4caf50', borderRadius: '5px' }}>
            ✅ Account Verified
          </div>
        ) : user.verificationStatus === 'pending' ? (
          <div style={{ color: '#ffcc00', margin: '20px 0', padding: '10px', border: '1px solid #ffcc00', borderRadius: '5px' }}>
            ⏳ Verification pending. You will be able to sell after approval.
          </div>
        ) : (
          <div style={{ margin: '20px 0' }}>
            <p style={{ color: '#ff4444' }}>❌ Account Unverified</p>
            <p style={{ fontSize: '14px', marginBottom: '15px' }}>
              Complete your verification to post accounts on the marketplace.
            </p>
            <Link to="/verify" className="auth-button" style={{ display: 'inline-block', textDecoration: 'none', color: '#000' }}>
              Verify Now
            </Link>
          </div>
        )}

        <div style={{ marginTop: '30px', borderTop: '1px solid #333', paddingTop: '20px' }}>
          <h3 style={{ color: '#ffcc00', marginBottom: '12px' }}>Trade History</h3>
          <p>Successful trades: <strong>{successfulTrades.length}</strong></p>
          <p>Cancelled trades: <strong>{cancelledTrades.length}</strong></p>
          <Link to="/transactions" className="auth-button" style={{ display: 'inline-block', textDecoration: 'none', color: '#000', marginTop: '8px' }}>
            View Full History
          </Link>
        </div>

        <div style={{ marginTop: '30px', borderTop: '1px solid #333', paddingTop: '20px' }}>
          <h3 style={{ color: '#ffcc00', marginBottom: '12px' }}>Your Marketplace Posts</h3>
          {myPosts.length === 0 ? (
            <p>You have not posted any accounts yet.</p>
          ) : (
            myPosts.map((post) => (
              <div key={post.id} style={{ background: '#161622', padding: '14px', borderRadius: '8px', marginBottom: '12px' }}>
                {editingId === post.id ? (
                  <div>
                    <input className="auth-input" value={editForm.caption} onChange={(e) => setEditForm({ ...editForm, caption: e.target.value })} placeholder="Caption" />
                    <input className="auth-input" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} placeholder="Price" />
                    <select className="auth-input" value={editForm.rank} onChange={(e) => setEditForm({ ...editForm, rank: e.target.value })}>
                      <option value="">Select Current Rank</option>
                      <option value="Warrior">Warrior</option>
                      <option value="Elite">Elite</option>
                      <option value="Grandmaster">Grandmaster</option>
                      <option value="Epic">Epic</option>
                      <option value="Legend">Legend</option>
                      <option value="Mythic">Mythic</option>
                      <option value="Mythic Honor">Mythic Honor</option>
                      <option value="Mythic Glory">Mythic Glory</option>
                      <option value="Mythic Immortal">Mythic Immortal</option>
                    </select>
                    <input className="auth-input" value={editForm.mlId} onChange={(e) => setEditForm({ ...editForm, mlId: e.target.value })} placeholder="ML ID" />
                    <input className="auth-input" value={editForm.serverId} onChange={(e) => setEditForm({ ...editForm, serverId: e.target.value })} placeholder="Server ID" />
                    <input className="auth-input" value={editForm.securityLock} onChange={(e) => setEditForm({ ...editForm, securityLock: e.target.value })} placeholder="Security Lock (Days)" />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                      <button className="auth-button" onClick={() => saveEdit(post.id)} style={{ width: 'auto' }}>Save</button>
                      <button className="auth-button" onClick={() => setEditingId(null)} style={{ width: 'auto', background: '#666' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p><strong>{post.caption}</strong></p>
                    <p>Price: {post.price}</p>
                    <p>Rank: {post.rank}</p>
                    <p>ML ID: {post.mlId} | Server ID: {post.serverId}</p>
                    {post.securityLock ? <p>Security Lock: {post.securityLock} days</p> : null}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                      <button className="auth-button" onClick={() => startEdit(post)} style={{ width: 'auto' }}>Edit</button>
                      <button className="auth-button" onClick={() => deletePost(post.id)} style={{ width: 'auto', background: '#ff4d4f' }}>Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}