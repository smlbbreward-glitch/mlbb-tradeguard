import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/Marketplace.css';

function decodeBase64(str) {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decoded = decodeURIComponent(escape(atob(base64)));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export default function ShareListing() {
  const { encodedData } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!encodedData) {
      setError(true);
      return;
    }
    const data = decodeBase64(encodedData);
    if (!data) {
      setError(true);
    } else {
      setPost(data);
    }
  }, [encodedData]);

  if (error) {
    return (
      <div className="mp" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h2 style={{ color: '#ff6b6b' }}>Invalid or corrupted share link.</h2>
        <button className="mp-btn" onClick={() => navigate('/marketplace')} style={{ marginTop: '20px' }}>
          Go to Marketplace
        </button>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mp" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p>Loading listing...</p>
      </div>
    );
  }

  return (
    <div className="mp">
      <div className="mp-aurora">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
      </div>

      <div className="mp-header">
        <h1>
          <span className="mp-logo-icon">⚔️</span>
          Shared Listing
        </h1>
        <p>Viewing a shared MLBB account listing</p>
      </div>

      <div className="mp-card mp-card-listing" style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div className="mp-card-header">
          {post.premium && <span className="mp-premium-badge">⭐ Premium</span>}
          <h3>{post.caption}</h3>
        </div>

        <div className="mp-card-body">
          <div className="mp-row">
            <span className="mp-label-sm">Price</span>
            <span className="mp-price">{post.price}</span>
          </div>
          {post.seller && (
            <div className="mp-row">
              <span className="mp-label-sm">Seller</span>
              <span>{post.seller}</span>
            </div>
          )}
          <div className="mp-row">
            <span className="mp-label-sm">Rank</span>
            <span>{post.rank}</span>
          </div>
          {post.hero && (
            <div className="mp-row">
              <span className="mp-label-sm">Main Hero</span>
              <span>{post.hero}</span>
            </div>
          )}
          <div className="mp-row">
            <span className="mp-label-sm">ML ID</span>
            <span>{post.mlId}</span>
          </div>
          <div className="mp-row">
            <span className="mp-label-sm">Server</span>
            <span>{post.serverId}</span>
          </div>
          {post.securityLock && (
            <div className="mp-row">
              <span className="mp-label-sm">Security Lock</span>
              <span>{post.securityLock} days</span>
            </div>
          )}
          <div className="mp-row">
            <span className="mp-label-sm">Platform</span>
            <span>{post.platform || 'Mobile Legends'}</span>
          </div>
        </div>

        {post.files?.length > 0 && (
          <div className="mp-gallery">
            {post.files.map((file, index) => (
              <div key={index} className="mp-gallery-item">
                {file.preview ? (
                  <img src={file.preview} alt={file.name} />
                ) : (
                  <a href={file.downloadUrl} target="_blank" rel="noreferrer" className="mp-attachment">
                    Open attachment: {file.name}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mp-card-actions">
          <button className="mp-btn" onClick={() => navigate('/marketplace')}>
            Browse Marketplace
          </button>
        </div>
      </div>
    </div>
  );
}
