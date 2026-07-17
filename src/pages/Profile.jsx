import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Auth.css';
import { apiUpdatePost, apiDeletePost } from '../utils/api';

export default function Profile({ user, marketplacePosts, setMarketplacePosts, transactionHistory, data }) {
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ caption: '', price: '', rank: '', mlId: '', serverId: '', securityLock: '' });

  useEffect(() => {
    if (user) data.refreshPosts();
  }, [user, data]);

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

  if (!user) return <div className="auth-container"><div className="auth-card"><h2 style={{ color: '#ffd666' }}>Please log in to view your profile.</h2></div></div>;

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

  const saveEdit = async (postId) => {
    try {
      await apiUpdatePost(postId, editForm);
      await data.refreshPosts();
    } catch (e) { alert(e.message); }
    setEditingId(null);
  };

  const deletePost = async (postId) => {
    try {
      await apiDeletePost(postId);
      if (setMarketplacePosts) setMarketplacePosts((prev) => prev.filter((p) => p.id !== postId));
      await data.refreshPosts();
    } catch (e) {
      const msg = e.message || 'unknown error';
      if (msg === 'Not found') {
        if (setMarketplacePosts) setMarketplacePosts((prev) => prev.filter((p) => p.id !== postId));
        await data.refreshPosts();
        return;
      }
      alert('Delete failed: ' + msg + ' (post id=' + postId + ')');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '800px', textAlign: 'left' }}>
        <h1 style={{ fontFamily: "'Cinzel', serif", color: '#ffd666', textShadow: '0 0 20px rgba(255,215,0,0.3)', marginBottom: '6px' }}>My Profile</h1>
        <p style={{ fontSize: '16px', margin: '15px 0', color: '#a0b4c8' }}>
          <strong style={{ color: '#ffd666' }}>Username:</strong> {user.username}
        </p>

        {user.isVerified ? (
          <div style={{ color: '#4caf50', margin: '20px 0', padding: '12px', borderRadius: '14px', border: '1px solid rgba(76,175,80,0.4)', background: 'rgba(76,175,80,0.08)' }}>
            ✅ Account Verified
          </div>
        ) : user.verificationStatus === 'pending' ? (
          <div style={{ color: '#ffd666', margin: '20px 0', padding: '12px', borderRadius: '14px', border: '1px solid rgba(255,215,0,0.4)', background: 'rgba(255,215,0,0.08)' }}>
            ⏳ Verification pending. You will be able to sell after approval.
          </div>
        ) : (
          <div style={{ margin: '20px 0' }}>
            <p style={{ color: '#ff7b7b' }}>❌ Account Unverified</p>
            <p style={{ fontSize: '14px', marginBottom: '15px', color: '#a0b4c8' }}>
              Complete your verification to post accounts on the marketplace.
            </p>
            <Link to="/verify" className="auth-button" style={{ display: 'inline-block', textDecoration: 'none', color: '#000', width: 'auto' }}>
              Verify Now
            </Link>
          </div>
        )}

        <div style={{ marginTop: '30px', borderTop: '1px solid rgba(255,215,0,0.15)', paddingTop: '20px' }}>
          <h3 style={{ fontFamily: "'Cinzel', serif", color: '#ffd666', marginBottom: '12px' }}>Trade History</h3>
          <p style={{ color: '#a0b4c8' }}>Successful trades: <strong style={{ color: '#4caf50' }}>{successfulTrades.length}</strong></p>
          <p style={{ color: '#a0b4c8' }}>Cancelled trades: <strong style={{ color: '#ff7b7b' }}>{cancelledTrades.length}</strong></p>
          <Link to="/transactions" className="auth-button" style={{ display: 'inline-block', textDecoration: 'none', color: '#000', marginTop: '8px', width: 'auto' }}>
            View Full History
          </Link>
        </div>

        <div style={{ marginTop: '30px', borderTop: '1px solid rgba(255,215,0,0.15)', paddingTop: '20px' }}>
          <h3 style={{ fontFamily: "'Cinzel', serif", color: '#ffd666', marginBottom: '12px' }}>Your Marketplace Posts</h3>
          {myPosts.length === 0 ? (
            <p style={{ color: '#a0b4c8' }}>You have not posted any accounts yet.</p>
          ) : (
            myPosts.map((post) => (
              <div key={post.id} className="auth-card" style={{ marginBottom: '12px', textAlign: 'left' }}>
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
                    <p><strong style={{ color: '#ffd666' }}>{post.caption}</strong></p>
                    <p style={{ color: '#a0b4c8' }}>Price: {post.price}</p>
                    <p style={{ color: '#a0b4c8' }}>Rank: {post.rank}</p>
                    <p style={{ color: '#a0b4c8' }}>ML ID: {post.mlId} | Server ID: {post.serverId}</p>
                    {post.securityLock ? <p style={{ color: '#a0b4c8' }}>Security Lock: {post.securityLock} days</p> : null}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                      <button className="auth-button" onClick={() => startEdit(post)} style={{ width: 'auto' }}>Edit</button>
                      <button className="auth-button" onClick={() => deletePost(post.id)} style={{ width: 'auto', background: '#c62828' }}>Delete</button>
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
