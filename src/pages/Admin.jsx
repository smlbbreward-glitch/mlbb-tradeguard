import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import '../styles/Auth.css';
import { apiApproveVerification, apiDeclineVerification } from '../utils/api';

export default function Admin({ data, verifications, resetAllData }) {
  const [searchParams] = useSearchParams();
  const action = searchParams.get('action');
  const username = searchParams.get('username');
  const reason = searchParams.get('reason') || 'No further details provided.';

  const approveUser = async (uname) => {
    const v = verifications.find((r) => r.username?.toLowerCase() === uname.toLowerCase());
    if (v) await apiApproveVerification(v.id);
    await data.refresh();
  };

  const declineUser = async (uname) => {
    const v = verifications.find((r) => r.username?.toLowerCase() === uname.toLowerCase());
    if (v) await apiDeclineVerification(v.id, reason);
    await data.refresh();
  };

  useEffect(() => {
    if (!username || !action) return;
    if (action === 'approve') approveUser(username);
    else if (action === 'decline') declineUser(username);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, username]);

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '900px', textAlign: 'left' }}>
        <h1 style={{ fontFamily: "'Cinzel', serif", color: '#ffd666', textShadow: '0 0 20px rgba(255,215,0,0.3)', marginBottom: '8px' }}>Developer Dashboard</h1>
        <p style={{ color: '#9a9ab0', marginBottom: '20px' }}>Manage verification requests from here.</p>

        <h3 style={{ fontFamily: "'Cinzel', serif", color: '#ffd666', marginBottom: '12px' }}>Verification Queue</h3>
        {verifications.length === 0 ? (
          <p style={{ color: '#a0b4c8' }}>No pending requests.</p>
        ) : verifications.map((r) => (
          <div key={r.id} className="auth-card" style={{ marginBottom: '10px', textAlign: 'left' }}>
            <p><strong style={{ color: '#ffd666' }}>{r.username}</strong></p>
            <p style={{ color: '#a0b4c8' }}>ID Type: {r.idType}</p>
            <p style={{ color: '#a0b4c8' }}>Address: {r.address}</p>
            <p style={{ color: '#a0b4c8' }}>FB Link 1: {r.fbLink1}</p>
            <p style={{ color: '#a0b4c8' }}>FB Link 2: {r.fbLink2}</p>
            {r.files?.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <p style={{ color: '#ffd666', fontWeight: 600 }}>Uploaded images:</p>
                <div style={{ display: 'grid', gap: '10px' }}>
                   {r.files.map((file, index) => {
                     const label = (file.name && file.name !== 'image.png') ? file.name : `verification_upload_${index + 1}`;
                     return (
                       <div key={`${r.id}-${index}`}>
                         {file.dataUrl && file.type?.startsWith('image/') ? (
                           <img src={file.dataUrl} alt={`${r.username} verification upload ${index + 1}`} style={{ maxWidth: '100%', maxHeight: '320px', borderRadius: '12px', border: '1px solid rgba(0,212,255,0.2)' }} />
                         ) : file.dataUrl ? (
                           <a href={file.dataUrl} download={label} style={{ color: '#00d4ff' }}>
                             Download {label}
                           </a>
                         ) : null}
                       </div>
                     );
                   })}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => approveUser(r.username)} className="auth-button" style={{ width: 'auto', background: 'linear-gradient(135deg, #4caf50, #2e7d32)' }}>Approve</button>
              <button onClick={() => declineUser(r.username)} className="auth-button" style={{ width: 'auto', background: 'linear-gradient(135deg, #c62828, #b71c1c)' }}>Decline</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid rgba(255,215,0,0.15)' }}>
        <h3 style={{ fontFamily: "'Cinzel', serif", color: '#ff4d4f', marginBottom: '12px' }}>Danger Zone</h3>
        <p style={{ color: '#a0b4c8', marginBottom: '12px' }}>This will reset all user data, orders, and marketplace posts. Admin accounts will be preserved.</p>
        <button onClick={() => {
          if (window.confirm('Are you sure? This will delete ALL user data except admin accounts. This action cannot be undone.')) {
            resetAllData();
          }
        }} className="auth-button" style={{ width: 'auto', background: 'linear-gradient(135deg, #c62828, #b71c1c)' }}>
          Reset All Data
        </button>
      </div>
    </div>
  );
}
