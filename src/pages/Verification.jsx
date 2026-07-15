import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Auth.css';

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1526558602091958374/T9iBCYM-AWtE7pG-x80rCt17LNeYjL2_CUmsBi-GJ96cgIxq3y2Hm4Ibp9RlaCCs89Ad';

export default function Verification({ user, setCurrentUser, setPendingRequests }) {
  const [formData, setFormData] = useState({
    idType: 'School ID',
    address: '',
    fbLink1: '',
    fbLink2: ''
  });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const navigate = useNavigate();

  const dataURLtoBlob = (dataURL) => {
    const [header, data] = dataURL.split(',');
    const mime = header.match(/data:(.*?);/)[1];
    const binary = atob(data);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) {
      setUploadedFiles([]);
      setFilePreviews([]);
      return;
    }

    const limitedFiles = selectedFiles.slice(0, 3);
    const filePromises = limitedFiles.map((file) => new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ name: file.name, type: file.type, dataUrl: reader.result });
        reader.readAsDataURL(file);
      } else {
        resolve({ name: file.name, type: file.type, dataUrl: '' });
      }
    }));

    Promise.all(filePromises).then((files) => {
      setUploadedFiles(limitedFiles);
      setFilePreviews(files);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const submission = {
      id: Date.now(),
      username: user?.username || 'Unknown user',
      ...formData,
      uploadedFiles: filePreviews
    };

    setPendingRequests((prev) => [...prev, submission]);
    setCurrentUser((prev) => prev ? { ...prev, verificationStatus: 'pending', isVerified: false } : prev);

    try {
      const payload = {
        content: `ADMIN REVIEW REQUIRED\nNew verification request received.\nUser: ${submission.username}\nID Type: ${submission.idType}\nAddress: ${submission.address}\nFB Link 1: ${submission.fbLink1}\nFB Link 2: ${submission.fbLink2}\n\nPlease review this request in the admin panel.`
      };

      if (filePreviews.length > 0) {
        payload.content += `\nAttachments: ${filePreviews.map((file) => file.name).join(', ')}`;
      }

      const formDataToSend = new FormData();
      formDataToSend.append('payload_json', JSON.stringify(payload));

      filePreviews.forEach((file) => {
        if (file.dataUrl) {
          const blob = dataURLtoBlob(file.dataUrl);
          formDataToSend.append('files', blob, file.name);
        }
      });

      const response = await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        body: formDataToSend
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Discord webhook failed: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('Discord webhook error:', error);
      alert(`Webhook failed: ${error.message}`);
    }

    alert('Verification submitted to MLBB Grab Admins. You will be able to sell after approval.');
    navigate('/profile');
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-card">
        <h2>MLBB Grab ID Verification</h2>
        <select className="auth-input" value={formData.idType} onChange={(e) => setFormData({ ...formData, idType: e.target.value })}>
          <option>School ID</option>
          <option>Gov ID</option>
        </select>
        <input className="auth-input" placeholder="Current Address" required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
        <input className="auth-input" placeholder="Relative FB Link 1" required value={formData.fbLink1} onChange={(e) => setFormData({ ...formData, fbLink1: e.target.value })} />
        <input className="auth-input" placeholder="Relative FB Link 2" required value={formData.fbLink2} onChange={(e) => setFormData({ ...formData, fbLink2: e.target.value })} />
        <input type="file" className="auth-input" multiple accept="image/*" onChange={handleFileChange} />
        <p style={{ color: '#9eb0d5', marginTop: '6px' }}>Upload up to 3 images.</p>
        {filePreviews.length > 0 && (
          <div style={{ marginTop: '10px', color: '#fff' }}>
            <p>Selected files:</p>
            <div style={{ display: 'grid', gap: '10px' }}>
              {filePreviews.map((file, index) => (
                <div key={`${file.name}-${index}`}>
                  <p>{file.name}</p>
                  {file.dataUrl && (
                    <img src={file.dataUrl} alt={`Verification upload preview ${index + 1}`} style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '4px' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <button type="submit" className="auth-button">Submit for Approval</button>
      </form>
    </div>
  );
}