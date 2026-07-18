import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import '../styles/Auth.css';
import { apiSubmitVerification } from '../utils/api';
import { sanitizeFileName, compressImageDataUrl } from '../utils/files';

export default function Verification({ user, setCurrentUser, data }) {
  const [formData, setFormData] = useState({
    idType: 'School ID',
    address: '',
    fbLink1: '',
    fbLink2: ''
  });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) {
      setUploadedFiles([]);
      setFilePreviews([]);
      return;
    }

    const limitedFiles = selectedFiles.slice(0, 3);
    const filePromises = limitedFiles.map((file) => new Promise((resolve) => {
      const safeName = sanitizeFileName(file.name);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ name: safeName, type: file.type, dataUrl: reader.result });
        reader.onerror = () => resolve({ name: safeName, type: file.type, dataUrl: '' });
        reader.readAsDataURL(file);
      } else {
        resolve({ name: safeName, type: file.type, dataUrl: '' });
      }
    }));

    Promise.all(filePromises).then((files) => {
      setUploadedFiles(limitedFiles.map((f) => (f.name === 'image.png' ? new File([f], `upload_${Date.now()}.png`, { type: f.type }) : f)));
      setFilePreviews(files);
    }).catch((e) => {
      console.error('File reading failed:', e);
      setUploadedFiles([]);
      setFilePreviews([]);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const submission = {
      id: Date.now(),
      username: user?.username || 'Unknown user',
      ...formData,
      uploadedFiles: filePreviews
    };

    setCurrentUser((prev) => prev ? { ...prev, verificationStatus: 'pending', isVerified: false } : prev);

    const payload = {
      idType: submission.idType,
      address: submission.address,
      fbLink1: submission.fbLink1,
      fbLink2: submission.fbLink2,
      uploadedFiles: filePreviews
    };

    let sent = false;
    try {
      const compressed = await Promise.all(
        filePreviews.map(async (f) => ({ ...f, dataUrl: await compressImageDataUrl(f.dataUrl) }))
      );
      const compressedPayload = { ...payload, uploadedFiles: compressed };
      await apiSubmitVerification(compressedPayload);
      sent = true;
    } catch (e) {
      console.error('verification submit failed', e);
    }

    setTimeout(() => {
      alert(sent
        ? 'Verification submitted to MLBB Buy Admins. You will be able to sell after approval.'
        : 'Verification saved locally. It will be reviewed by an admin shortly.');
      setSubmitting(false);
      navigate('/profile');
    }, 300);
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-card">
        <h2 style={{ fontFamily: "'Cinzel', serif", color: '#ffd666', textShadow: '0 0 20px rgba(255,215,0,0.3)' }}>MLBB Buy ID Verification</h2>
        <select className="auth-input" value={formData.idType} onChange={(e) => setFormData({ ...formData, idType: e.target.value })}>
          <option>School ID</option>
          <option>Gov ID</option>
        </select>
        <input className="auth-input" placeholder="Current Address" required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
        <input className="auth-input" placeholder="Relative FB Link 1" required value={formData.fbLink1} onChange={(e) => setFormData({ ...formData, fbLink1: e.target.value })} />
        <input className="auth-input" placeholder="Relative FB Link 2" required value={formData.fbLink2} onChange={(e) => setFormData({ ...formData, fbLink2: e.target.value })} />
        <input type="file" className="auth-input" multiple accept="image/*" onChange={handleFileChange} disabled={submitting} />
        <p style={{ color: '#a0b4c8', marginTop: '6px', fontSize: '13px' }}>Upload up to 3 images.</p>
        {filePreviews.length > 0 && (
          <div style={{ marginTop: '10px', color: '#fff' }}>
            <p style={{ color: '#ffd666', fontWeight: 600 }}>Selected files:</p>
            <div style={{ display: 'grid', gap: '10px' }}>
              {filePreviews.map((file, index) => (
                <div key={`${file.name}-${index}`}>
                  <p style={{ color: '#a0b4c8', fontSize: '13px' }}>{file.name}</p>
                  {file.dataUrl && (
                    <img src={file.dataUrl} alt={`Verification upload preview ${index + 1}`} style={{ maxWidth: '100%', borderRadius: '12px', marginTop: '4px', border: '1px solid rgba(0,212,255,0.2)' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <button type="submit" className="auth-button" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit for Approval'}
        </button>
      </form>

      {submitting && createPortal(
        <div className="mp-checkout-overlay">
          <div className="mp-checkout-panel" style={{ textAlign: 'center' }}>
            <h2 style={{ fontFamily: "'Cinzel', serif", color: '#ffd666', textShadow: '0 0 20px rgba(255,215,0,0.3)', marginBottom: '12px' }}>Submitting Verification</h2>
            <p style={{ color: '#a0b4c8' }}>Please wait while we process your request...</p>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
              <div className="mp-logo-icon" style={{ fontSize: '32px' }}>⚔️</div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
