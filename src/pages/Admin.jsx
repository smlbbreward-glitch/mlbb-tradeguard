import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function Admin({ pendingRequests, setPendingRequests, approveUser, declineUser }) {
  const [searchParams] = useSearchParams();
  const action = searchParams.get('action');
  const username = searchParams.get('username');
  const reason = searchParams.get('reason') || 'No further details provided.';

  useEffect(() => {
    if (!username || !action) return;

    if (action === 'approve') {
      approveUser(username);
    } else if (action === 'decline') {
      declineUser(username, reason);
    }
  }, [action, username, reason, approveUser, declineUser]);

  return (
    <div style={{ padding: '40px', color: '#fff' }}>
      <h1>Developer Dashboard</h1>
      <p style={{ color: '#9eb0d5', marginBottom: '20px' }}>Manage verification requests from here.</p>

      <h2>Verification Queue</h2>
      {pendingRequests.map((r) => (
        <div key={r.id} style={{ background: '#161622', padding: '20px', margin: '10px 0' }}>
          <p>Request from: {r.username}</p>
          <p>ID Type: {r.idType}</p>
          <p>Address: {r.address}</p>
          <p>FB Link 1: {r.fbLink1}</p>
          <p>FB Link 2: {r.fbLink2}</p>
          {r.uploadedFiles?.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <p>Uploaded images:</p>
              <div style={{ display: 'grid', gap: '10px' }}>
                {r.uploadedFiles.map((file, index) => (
                  <div key={`${r.id}-${index}`}>
                    {file.dataUrl && file.type?.startsWith('image/') ? (
                      <img src={file.dataUrl} alt={`${r.username} verification upload ${index + 1}`} style={{ maxWidth: '100%', maxHeight: '320px', borderRadius: '8px' }} />
                    ) : file.dataUrl ? (
                      <a href={file.dataUrl} download={file.name} style={{ color: '#5eb7ff' }}>
                        Download {file.name}
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button onClick={() => { approveUser(r.username); setPendingRequests((prev) => prev.filter((req) => req.id !== r.id)); }} style={{ background: 'green', color: '#fff', padding: '8px 12px', borderRadius: '6px' }}>Approve</button>
            <button onClick={() => { declineUser(r.username); setPendingRequests((prev) => prev.filter((req) => req.id !== r.id)); }} style={{ background: 'crimson', color: '#fff', padding: '8px 12px', borderRadius: '6px' }}>Decline</button>
          </div>
        </div>
      ))}
    </div>
  );
}