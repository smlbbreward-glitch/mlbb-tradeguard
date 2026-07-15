import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Auth.css';

export default function Marketplace({ user, setActiveTrade, marketplacePosts, setMarketplacePosts }) {
  const posts = marketplacePosts;
  const [activeTab, setActiveTab] = useState('browse');
  const [formData, setFormData] = useState({ caption: '', price: '', rank: '', mlId: '', serverId: '', securityLock: '', files: [] });
  const [previewFiles, setPreviewFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formError, setFormError] = useState('');
  const navigate = useNavigate();

  const readFileAsDataUrl = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFormData((prev) => ({ ...prev, files: selectedFiles }));

    const preparedFiles = await Promise.all(
      selectedFiles.map(async (file) => ({
        name: file.name,
        preview: file.type.startsWith('image/') ? await readFileAsDataUrl(file) : null,
        downloadUrl: await readFileAsDataUrl(file)
      }))
    );

    setPreviewFiles(preparedFiles);
  };

  const handlePost = (e) => {
    e.preventDefault();
    setFormError('');

    if (!user?.isVerified) {
      alert('⚠️ You must be verified before you can sell. Please verify your account first.');
      return;
    }

    const mlIdValue = formData.mlId.trim();
    const serverIdValue = formData.serverId.trim();

    if (!/^\d{8,10}$/.test(mlIdValue)) {
      setFormError('⚠️ ML ID must be 8 to 10 digits.');
      return;
    }

    if (!/^\d{3,5}$/.test(serverIdValue)) {
      setFormError('⚠️ Server ID must be 3 to 5 digits.');
      return;
    }

    const listing = {
      ...formData,
      platform: 'Mobile Legends',
      mlId: mlIdValue,
      serverId: serverIdValue,
      id: Date.now(),
      seller: user?.username,
      status: 'available',
      files: previewFiles.map((file) => ({
        name: file.name,
        preview: file.preview,
        downloadUrl: file.downloadUrl
      }))
    };

    setMarketplacePosts((prev) => [listing, ...prev]);
    setFormData({ caption: '', price: '', rank: '', mlId: '', serverId: '', securityLock: '', files: [] });
    setPreviewFiles([]);
    setActiveTab('browse');
  };

  return (
    <div className="auth-container">
      <h1 style={{ color: '#ffcc00', marginBottom: '20px' }}>MLBB Grab Marketplace</h1>

      {!user ? (
        <div className="warning-banner">Please log in to browse or create a listing.</div>
      ) : !user.isVerified ? (
        <div className="warning-banner">
          ⚠️ Verify your account first. You cannot sell listings until verification is approved.
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        <button onClick={() => setActiveTab('browse')} className="auth-button" style={{ width: 'auto' }}>Browse Accounts</button>
        <button onClick={() => setActiveTab('post')} className="auth-button" style={{ width: 'auto' }}>Post Account</button>
      </div>

      {activeTab === 'post' ? (
        <form onSubmit={handlePost} className="auth-card">
          <h2 style={{ marginBottom: '20px' }}>Post Your Account</h2>
          <p style={{ color: '#ffcc00', marginBottom: '12px' }}>Only Mobile Legends accounts are allowed here.</p>
          {formError && <p style={{ color: '#ff4444', marginBottom: '10px' }}>{formError}</p>}

          <input className="auth-input" placeholder="Caption" required onChange={(e) => setFormData({ ...formData, caption: e.target.value })} />
          <input className="auth-input" placeholder="Price" required onChange={(e) => setFormData({ ...formData, price: e.target.value })} />

          <select className="auth-input" required value={formData.rank} onChange={(e) => setFormData({ ...formData, rank: e.target.value })}>
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

          <input className="auth-input" placeholder="ML ID (8 to 10 digits)" required inputMode="numeric" pattern="[0-9]*" onChange={(e) => setFormData({ ...formData, mlId: e.target.value })} />
          <input className="auth-input" placeholder="Server ID (3 to 5 digits)" required inputMode="numeric" pattern="[0-9]*" onChange={(e) => setFormData({ ...formData, serverId: e.target.value })} />
          <input className="auth-input" placeholder="Security Lock (Days, optional)" onChange={(e) => setFormData({ ...formData, securityLock: e.target.value })} />

          <label className="upload-label">Add photos or files (you can add multiple)</label>
          <input className="auth-input" type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt" required onChange={handleFileChange} />

          {previewFiles.length > 0 && (
            <div className="preview-list">
              {previewFiles.map((file, index) => (
                <div className="preview-item" key={index}>
                  {file.preview ? <img src={file.preview} alt={file.name} /> : <span>{file.name}</span>}
                </div>
              ))}
            </div>
          )}

          <button type="submit" className="auth-button">Publish Listing</button>
        </form>
      ) : (
        <div style={{ width: '100%', maxWidth: '600px' }}>
          <input
            className="auth-input"
            placeholder="Search seller or caption"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ marginBottom: '16px' }}
          />

          {posts.filter((post) => {
            const term = searchTerm.trim().toLowerCase();
            if (!term) return true;
            return [post.seller, post.caption, post.rank, post.platform]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(term));
          }).length === 0 ? <p style={{ color: '#aaa' }}>No accounts listed yet.</p> : posts.filter((post) => {
            const term = searchTerm.trim().toLowerCase();
            if (!term) return true;
            return [post.seller, post.caption, post.rank, post.platform]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(term));
          }).map((p) => (
            <div key={p.id} className="auth-card" style={{ marginBottom: '20px', textAlign: 'left' }}>
              <h3>{p.caption}</h3>
              <p><strong>Price:</strong> {p.price}</p>
              <p>Seller: {p.seller} | Rank: {p.rank}</p>
              <p>Platform: {p.platform}</p>
              <p>ML ID: {p.mlId} | Server ID: {p.serverId}</p>
              {p.securityLock ? <p>Security Lock: {p.securityLock} days</p> : null}
              {p.files?.length > 0 && (
                <div style={{ margin: '12px 0' }}>
                  {p.files.map((file, index) => (
                    <div key={index} style={{ marginBottom: '10px' }}>
                      {file.preview ? (
                        <img src={file.preview} alt={file.name} style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '8px' }} />
                      ) : (
                        <a href={file.downloadUrl} target="_blank" rel="noreferrer" style={{ color: '#ffcc00' }}>
                          Open attachment: {file.name}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {p.seller?.toLowerCase() === user?.username?.toLowerCase() ? (
                <button className="auth-button" style={{ background: '#666' }} disabled>Your Listing</button>
              ) : p.status === 'pending' ? (
                <button className="auth-button" style={{ background: '#666' }} disabled>Pending</button>
              ) : (
                <button onClick={() => { setActiveTrade(p); navigate('/midman'); }} className="auth-button">Buy Now</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}