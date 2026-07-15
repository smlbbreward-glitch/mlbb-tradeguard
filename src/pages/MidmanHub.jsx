import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MidmanHub({ currentUser, activeTrade, setTradeData, middlemanRequests, setMiddlemanRequests, setTransactionHistory, setMarketplacePosts }) {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('gcash');
  const [selectedMidman, setSelectedMidman] = useState('');
  const [activeChatId, setActiveChatId] = useState(null);
  const [draftMessage, setDraftMessage] = useState('');
  const isMiddlemanView = currentUser?.role === 'middleman' || currentUser?.role === 'developer' || currentUser?.username === 'chrisford';
  const canCloseTrade = currentUser?.role === 'middleman' || currentUser?.role === 'developer' || currentUser?.username === 'chrisford';
  const canAccessPanel = currentUser?.role === 'middleman' || currentUser?.role === 'developer' || currentUser?.username === 'chrisford';

  const midmen = useMemo(() => [
    { id: 'midman-1', name: 'Midman A' },
    { id: 'midman-2', name: 'Midman B' },
    { id: 'midman-3', name: 'Midman C' }
  ], []);

  const handleApprove = () => {
    if (!selectedMidman) {
      alert('⚠️ Please select a middleman first.');
      return;
    }

    const newRequest = {
      id: Date.now(),
      postId: activeTrade?.id,
      caption: activeTrade?.caption || 'Marketplace request',
      buyer: currentUser?.username || activeTrade?.buyer || 'Unknown buyer',
      seller: activeTrade?.seller || 'Unknown seller',
      price: activeTrade?.price || 'N/A',
      paymentMethod,
      midman: selectedMidman,
      status: 'Pending',
      chat: [
        { sender: 'System', message: 'Middleman request received.' },
        { sender: 'Admin', message: 'Reviewing payment and trade details.' }
      ]
    };

    if (activeTrade?.id) {
      setMarketplacePosts((prev) => prev.map((post) => post.id === activeTrade.id ? { ...post, status: 'pending' } : post));
    }

    setMiddlemanRequests((prev) => [newRequest, ...prev]);
    setActiveChatId(newRequest.id);
    setTradeData(null);
    alert(`✅ Request submitted! Payment via ${paymentMethod.toUpperCase()} and ${selectedMidman} will handle the transaction.`);
  };

  const acceptRequest = (requestId) => {
    setMiddlemanRequests((prev) => prev.map((request) => request.id === requestId ? { ...request, status: 'Accepted' } : request));
    setActiveChatId(requestId);
  };

  const sendMessage = (requestId) => {
    if (!draftMessage.trim()) return;

    const request = middlemanRequests.find((item) => item.id === requestId);
    if (!request) return;

    const sender = currentUser?.username === request.buyer
      ? 'Buyer'
      : currentUser?.username === request.seller
        ? 'Seller'
        : 'Middleman';

    setMiddlemanRequests((prev) => prev.map((item) => item.id === requestId ? {
      ...item,
      chat: [...(item.chat || []), { sender, message: draftMessage.trim() }]
    } : item));
    setDraftMessage('');
  };

  const closeTrade = (requestId, outcome) => {
    const request = middlemanRequests.find((item) => item.id === requestId);
    if (!request) return;

    const closedEntry = {
      id: `${requestId}-${outcome.toLowerCase()}`,
      caption: request.caption,
      buyer: request.buyer,
      seller: request.seller,
      price: request.price,
      midman: request.midman,
      status: outcome,
      closedBy: currentUser?.username || 'System',
      closedAt: new Date().toLocaleString()
    };

    setTransactionHistory((prev) => [closedEntry, ...prev]);
    if (request.postId) {
      setMarketplacePosts((prev) => prev.map((post) => post.id === request.postId ? { ...post, status: outcome === 'Success' ? 'sold' : 'available' } : post));
    }
    setMiddlemanRequests((prev) => prev.map((item) => item.id === requestId ? {
      ...item,
      status: outcome,
      chat: [...(item.chat || []), { sender: 'System', message: `Trade marked as ${outcome}.` }]
    } : item));
    setActiveChatId(requestId);
  };

  const deleteRequest = (requestId) => {
    setMiddlemanRequests((prev) => prev.filter((request) => request.id !== requestId));
    if (activeChatId === requestId) {
      setActiveChatId(null);
    }
  };

  const clearActiveTrade = () => {
    setTradeData(null);
    navigate('/marketplace');
  };

  const myOrders = middlemanRequests.filter((request) => {
    const username = currentUser?.username?.toLowerCase();
    return (
      request.buyer?.toLowerCase() === username ||
      request.seller?.toLowerCase() === username ||
      request.midman?.toLowerCase() === username
    );
  });

  const activeRequest = middlemanRequests.find((request) => request.id === activeChatId) || null;

  return (
    <div style={{ padding: '40px', color: '#fff', maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '8px' }}>{isMiddlemanView ? 'Middleman Control Panel' : 'Checkout Order'}</h1>
      <p style={{ color: '#9eb0d5', marginBottom: '24px' }}>
        {isMiddlemanView ? 'Incoming orders appear here. Accept one to begin the private conversation with buyer and seller.' : 'Choose how you want to pay and who will help complete the trade.'}
      </p>

      {isMiddlemanView ? (
        <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: activeRequest ? '1fr 1.2fr' : '1fr', alignItems: 'start' }}>
          <div style={{ background: '#161622', padding: '20px', borderRadius: '16px' }}>
            <h3 style={{ marginBottom: '12px' }}>Orders</h3>
            {middlemanRequests.length === 0 ? (
              <p>No orders yet.</p>
            ) : middlemanRequests.map((request) => (
              <div key={request.id} style={{ background: '#0f1428', padding: '12px', borderRadius: '10px', marginBottom: '10px' }}>
                <p><strong>{request.caption}</strong></p>
                <p>Buyer: {request.buyer}</p>
                <p>Seller: {request.seller}</p>
                <p>Price: {request.price}</p>
                <p>Payment: {request.paymentMethod ? request.paymentMethod.toUpperCase() : 'N/A'}</p>
                <p>Midman: {request.midman || 'Pending'}</p>
                <p>Status: {request.status}</p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <button className="auth-button" style={{ width: 'auto' }} onClick={() => acceptRequest(request.id)}>
                    Accept
                  </button>
                  <button className="auth-button" style={{ width: 'auto', background: '#2f3550' }} onClick={() => setActiveChatId(request.id)}>
                    Open Chat
                  </button>
                  <button className="auth-button" style={{ width: 'auto', background: '#c62828' }} onClick={() => deleteRequest(request.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#161622', padding: '20px', borderRadius: '16px' }}>
            {activeRequest ? (
              <>
                <h3 style={{ marginBottom: '8px' }}>Conversation: {activeRequest.caption}</h3>
                <p style={{ color: '#9eb0d5', marginBottom: '8px' }}>Buyer: {activeRequest.buyer} | Seller: {activeRequest.seller}</p>
                <p style={{ color: '#9eb0d5', marginBottom: '12px' }}>Payment: {activeRequest.paymentMethod ? activeRequest.paymentMethod.toUpperCase() : 'N/A'} | Midman: {activeRequest.midman || 'Pending'}</p>
                <div style={{ background: '#0f1428', padding: '12px', borderRadius: '10px', minHeight: '240px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(activeRequest.chat || []).map((entry, index) => (
                    <div key={`${activeRequest.id}-${index}`} style={{ background: '#161622', padding: '8px 10px', borderRadius: '8px' }}>
                      <strong>{entry.sender}:</strong> {entry.message}
                    </div>
                  ))}
                </div>

                {canCloseTrade && activeRequest.status !== 'Success' && activeRequest.status !== 'Cancelled' && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    <button className="auth-button" style={{ width: 'auto', background: '#2e7d32' }} onClick={() => closeTrade(activeRequest.id, 'Success')}>
                      Mark Success
                    </button>
                    <button className="auth-button" style={{ width: 'auto', background: '#c62828' }} onClick={() => closeTrade(activeRequest.id, 'Cancelled')}>
                      Mark Cancelled
                    </button>
                  </div>
                )}

                <div style={{ marginTop: '12px' }}>
                  <textarea
                    value={draftMessage}
                    onChange={(e) => setDraftMessage(e.target.value)}
                    placeholder="Type a message to the buyer and seller"
                    style={{ width: '100%', minHeight: '90px', borderRadius: '8px', padding: '10px', border: '1px solid #2f3550', background: '#0f1428', color: '#fff' }}
                  />
                  <button className="auth-button" style={{ marginTop: '8px', width: 'auto' }} onClick={() => sendMessage(activeRequest.id)}>
                    Send Message
                  </button>
                </div>
              </>
            ) : (
              <div style={{ color: '#9eb0d5' }}>Select an order to start the conversation.</div>
            )}
          </div>
        </div>
      ) : null}

      {!isMiddlemanView && (
        <div style={{ background: '#161622', padding: '20px', borderRadius: '16px', marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px' }}>Your Orders</h3>
          {myOrders.length === 0 ? (
            <p>No order requests yet.</p>
          ) : myOrders.map((request) => (
            <div key={request.id} style={{ background: '#0f1428', padding: '12px', borderRadius: '10px', marginBottom: '10px' }}>
              <p><strong>{request.caption}</strong></p>
              <p>Seller: {request.seller} | Buyer: {request.buyer}</p>
              <p>Payment: {request.paymentMethod ? request.paymentMethod.toUpperCase() : 'N/A'}</p>
              <p>Status: {request.status}</p>
              <button className="auth-button" style={{ width: 'auto', marginTop: '8px' }} onClick={() => setActiveChatId(request.id)}>
                Open Chat
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTrade ? (
        <div style={{ background: '#161622', padding: '24px', borderRadius: '16px', marginTop: '24px' }}>
          <h3 style={{ marginBottom: '8px' }}>Checkout Order: {activeTrade.caption}</h3>
          <p style={{ color: '#cfd8e8' }}>Buyer: {activeTrade.buyer || 'Pending buyer'}</p>
          <p style={{ color: '#cfd8e8' }}>Seller: {activeTrade.seller}</p>
          <p style={{ color: '#cfd8e8' }}>Price: {activeTrade.price}</p>

          <div style={{ marginTop: '20px' }}>
            <h4 style={{ marginBottom: '10px' }}>Choose Payment Method</h4>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {[
                { id: 'gcash', label: 'GCash', bg: 'linear-gradient(135deg, #00a6ff, #0f4c81)', icon: 'G' },
                { id: 'maya', label: 'Maya', bg: 'linear-gradient(135deg, #7b2cbf, #ff4d97)', icon: 'M' }
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPaymentMethod(option.id)}
                  style={{
                    border: paymentMethod === option.id ? '2px solid #ffcc00' : '1px solid #2f3550',
                    background: option.bg,
                    color: '#fff',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    minWidth: '140px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
                      {option.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700' }}>{option.label}</div>
                      <div style={{ fontSize: '12px', opacity: 0.9 }}>Digital wallet</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <h4 style={{ marginBottom: '10px' }}>Select Midman</h4>
            <select
              value={selectedMidman}
              onChange={(e) => setSelectedMidman(e.target.value)}
              className="auth-input"
              style={{ maxWidth: '280px' }}
            >
              <option value="">Choose a midman</option>
              {midmen.map((midman) => (
                <option key={midman.id} value={midman.name}>{midman.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
            <button onClick={handleApprove} className="auth-button" style={{ width: 'auto' }}>
              {isMiddlemanView ? 'Approve & Reveal Info' : 'Confirm Order'}
            </button>
            <button onClick={clearActiveTrade} className="auth-button" style={{ width: 'auto', background: '#666' }}>
              Back
            </button>
          </div>
        </div>
      ) : (
        <p style={{ marginTop: '24px' }}>{!isMiddlemanView ? 'Choose an account to start a checkout request.' : 'No active trades currently.'}</p>
      )}
    </div>
  );
}