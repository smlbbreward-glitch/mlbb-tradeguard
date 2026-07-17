import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Marketplace.css';

const MIDMAN_FEE_RATE = 0.05;
const MIDMAN_FEE_MIN = 10;

export default function MidmanHub({ currentUser, activeTrade, setTradeData, middlemanRequests, setMiddlemanRequests, setTransactionHistory, setMarketplacePosts, orderHistory, setOrderHistory, middlemanUsers, addNotification, notifications, transactionHistory }) {
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('gcash');
  const [selectedMidman, setSelectedMidman] = useState('');
  const [activeChatId, setActiveChatId] = useState(null);
  const [draftMessage, setDraftMessage] = useState('');
  const [chatImage, setChatImage] = useState(null);
  const [userTab, setUserTab] = useState('chats');
  const isMiddlemanView = currentUser?.role === 'middleman' || currentUser?.role === 'developer' || currentUser?.username === 'chrisford' || middlemanUsers?.includes(currentUser?.username?.toLowerCase());
  const canCloseTrade = currentUser?.role === 'middleman' || currentUser?.role === 'developer' || currentUser?.username === 'chrisford' || middlemanUsers?.includes(currentUser?.username?.toLowerCase());
  const canAccessPanel = currentUser?.role === 'middleman' || currentUser?.role === 'developer' || currentUser?.username === 'chrisford' || middlemanUsers?.includes(currentUser?.username?.toLowerCase());

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

    const priceValue = parseFloat(activeTrade?.price) || 0;
    const isPremiumListing = activeTrade?.premium;
    const midmanFee = isPremiumListing ? 0 : Math.max(MIDMAN_FEE_MIN, Math.round(priceValue * MIDMAN_FEE_RATE));

    const newRequest = {
      id: Date.now(),
      postId: activeTrade?.id,
      caption: activeTrade?.caption || 'Marketplace request',
      buyer: currentUser?.username || activeTrade?.buyer || 'Unknown buyer',
      seller: activeTrade?.seller || 'Unknown seller',
      price: activeTrade?.price || 'N/A',
      paymentMethod,
      midman: selectedMidman,
      premium: isPremiumListing,
      midmanFee,
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

  const acceptRequestLocal = async (requestId) => {
    const request = middlemanRequests.find((item) => item.id === requestId);
    setActiveChatId(requestId);
    if (request) {
      await data.acceptRequest(requestId);
      addNotification(request.buyer, `Your order "${request.caption}" has been accepted by midman ${currentUser?.username}. You can now open chat.`, 'success');
      addNotification(request.seller, `Your order "${request.caption}" has been accepted by midman ${currentUser?.username}. You can now open chat.`, 'success');
    }
  };

  const handleChatImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setChatImage(reader.result);
    reader.readAsDataURL(file);
  };

  const sendMessage = async (requestId) => {
    if (!draftMessage.trim() && !chatImage) return;

    const request = middlemanRequests.find((item) => item.id === requestId);
    if (!request) return;

    const sender = currentUser?.username === request.buyer
      ? 'Buyer'
      : currentUser?.username === request.seller
        ? 'Seller'
        : 'Middleman';

    const messageEntry = { sender, message: draftMessage.trim() };
    if (chatImage) {
      messageEntry.image = chatImage;
    }

    await data.sendMessage(requestId, messageEntry);
    setDraftMessage('');
    setChatImage(null);
  };

  const closeTrade = async (requestId, outcome) => {
    await data.closeRequest(requestId, outcome);
    setActiveChatId(null);
  };

  const deleteRequestLocal = async (requestId) => {
    await data.deleteRequest(requestId);
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

  const myTransactions = useMemo(() => {
    if (!currentUser || !transactionHistory) return [];
    const username = currentUser.username?.toLowerCase();
    return transactionHistory.filter((entry) => {
      return (
        entry.buyer?.toLowerCase() === username ||
        entry.seller?.toLowerCase() === username ||
        entry.midman?.toLowerCase() === username
      );
    });
  }, [transactionHistory, currentUser]);

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
          {isMiddlemanView ? 'Middleman Control Panel' : 'Checkout Order'}
        </h1>
        <p>
          {isMiddlemanView ? 'Incoming orders appear here. Accept one to begin the private conversation with buyer and seller.' : 'Choose how you want to pay and who will help complete the trade.'}
        </p>
      </div>

      {isMiddlemanView ? (
        <div className="mp-card" style={{ display: 'grid', gap: '24px', gridTemplateColumns: activeRequest ? '1fr 1.2fr' : '1fr', alignItems: 'start' }}>
          <div className="mp-card">
            <h3 style={{ marginBottom: '12px' }}>Orders</h3>
            {middlemanRequests.length === 0 ? (
              <p className="mp-empty">No orders yet.</p>
            ) : middlemanRequests.map((request) => (
              <div key={request.id} className="mp-card" style={{ marginBottom: '10px' }}>
                <div className="mp-card-header">
                  {request.premium && <span className="mp-premium-badge">⭐ Premium</span>}
                  <h3>{request.caption}</h3>
                </div>
                <div className="mp-card-body">
                  <div className="mp-row">
                    <span className="mp-label-sm">Buyer</span>
                    <span>{request.buyer}</span>
                  </div>
                  <div className="mp-row">
                    <span className="mp-label-sm">Seller</span>
                    <span>{request.seller}</span>
                  </div>
                  <div className="mp-row">
                    <span className="mp-label-sm">Price</span>
                    <span className="mp-price">{request.price}</span>
                  </div>
                  {request.midmanFee > 0 && (
                    <div className="mp-row">
                      <span className="mp-label-sm">Midman Fee</span>
                      <span className="mp-price">{request.midmanFee}</span>
                    </div>
                  )}
                  {request.premium && (
                    <div className="mp-row">
                      <span className="mp-label-sm">Midman Fee</span>
                      <span className="mp-premium-tag">Waived</span>
                    </div>
                  )}
                  <div className="mp-row">
                    <span className="mp-label-sm">Payment</span>
                    <span>{request.paymentMethod ? request.paymentMethod.toUpperCase() : 'N/A'}</span>
                  </div>
                  <div className="mp-row">
                    <span className="mp-label-sm">Midman</span>
                    <span>{request.midman || 'Pending'}</span>
                  </div>
                  <div className="mp-row">
                    <span className="mp-label-sm">Status</span>
                    <span className={`mp-order-status mp-status-${request.status.toLowerCase()}`}>{request.status}</span>
                  </div>
                </div>
                <div className="mp-card-actions">
                  <button className="mp-btn" style={{ width: 'auto', marginTop: '10px' }} onClick={() => acceptRequestLocal(request.id)}>
                    Accept
                  </button>
                  <button className="mp-btn mp-btn-ghost" style={{ width: 'auto', marginTop: '10px' }} onClick={() => setActiveChatId(request.id)}>
                    Open Chat
                  </button>
                  <button className="mp-btn mp-btn-ghost" style={{ width: 'auto', marginTop: '10px', background: 'rgba(255,123,123,0.15)', borderColor: 'rgba(255,123,123,0.4)', color: '#ff7b7b' }} onClick={() => deleteRequestLocal(request.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mp-card">
            {activeRequest ? (
              <>
                <h3 style={{ marginBottom: '8px' }}>Conversation: {activeRequest.caption}</h3>
                <p style={{ color: '#9a9ab0', marginBottom: '8px' }}>Buyer: {activeRequest.buyer} | Seller: {activeRequest.seller}</p>
                <p style={{ color: '#9a9ab0', marginBottom: '12px' }}>Payment: {activeRequest.paymentMethod ? activeRequest.paymentMethod.toUpperCase() : 'N/A'} | Midman: {activeRequest.midman || 'Pending'}</p>
                <div className="mp-card" style={{ minHeight: '240px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(10,15,30,0.6)' }}>
                  {(activeRequest.chat || []).map((entry, index) => (
                    <div key={`${activeRequest.id}-${index}`} className="mp-card" style={{ marginBottom: '0' }}>
                      <strong style={{ color: '#ffd666' }}>{entry.sender}:</strong>
                      <span style={{ color: '#e6e6f0', marginLeft: '6px' }}>{entry.message}</span>
                      {entry.image && (
                        <div style={{ marginTop: '8px' }}>
                          <img src={entry.image} alt="Chat attachment" style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '12px', border: '1px solid rgba(0,212,255,0.3)' }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {canCloseTrade && activeRequest.status !== 'Success' && activeRequest.status !== 'Cancelled' && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    <button className="mp-btn" style={{ width: 'auto', marginTop: '10px', background: 'linear-gradient(135deg, #4caf50, #2e7d32)' }} onClick={() => closeTrade(activeRequest.id, 'Success')}>
                      Mark Success
                    </button>
                    <button className="mp-btn mp-btn-ghost" style={{ width: 'auto', marginTop: '10px', background: 'rgba(255,123,123,0.15)', borderColor: 'rgba(255,123,123,0.4)', color: '#ff7b7b' }} onClick={() => closeTrade(activeRequest.id, 'Cancelled')}>
                      Mark Cancelled
                    </button>
                  </div>
                )}

                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleChatImageChange}
                      style={{ fontSize: '12px', color: '#a0b4c8' }}
                    />
                    {chatImage && (
                      <img src={chatImage} alt="Preview" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(0,212,255,0.3)' }} />
                    )}
                  </div>
                  <textarea
                    value={draftMessage}
                    onChange={(e) => setDraftMessage(e.target.value)}
                    placeholder="Type a message to the buyer and seller"
                    className="mp-input"
                    style={{ minHeight: '90px' }}
                  />
                  <button className="mp-btn" style={{ marginTop: '8px', width: 'auto' }} onClick={() => sendMessage(activeRequest.id)}>
                    Send Message
                  </button>
                </div>
              </>
            ) : (
              <div className="mp-empty">Select an order to start the conversation.</div>
            )}
          </div>
        </div>
      ) : null}

      {!isMiddlemanView && (
        <div className="mp-card">
          <div className="mp-tabs" style={{ marginBottom: '18px' }}>
            <button
              onClick={() => setUserTab('chats')}
              className={`mp-tab ${userTab === 'chats' ? 'mp-tab-active' : ''}`}
            >
              Chats
            </button>
            <button
              onClick={() => setUserTab('transactions')}
              className={`mp-tab ${userTab === 'transactions' ? 'mp-tab-active' : ''}`}
            >
              Transactions
            </button>
          </div>

          {userTab === 'chats' ? (
            <>
              <h3 style={{ marginBottom: '12px' }}>Your Orders</h3>
              {myOrders.length === 0 ? (
                <p className="mp-empty">No order requests yet.</p>
              ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {myOrders.map((request) => (
                    <div key={request.id} className="mp-card" style={{ marginBottom: '0' }}>
                      <div className="mp-card-header">
                        {request.premium && <span className="mp-premium-badge">⭐ Premium</span>}
                        <h3>{request.caption}</h3>
                      </div>
                      <div className="mp-card-body">
                        <div className="mp-row">
                          <span className="mp-label-sm">Seller</span>
                          <span>{request.seller}</span>
                        </div>
                        <div className="mp-row">
                          <span className="mp-label-sm">Buyer</span>
                          <span>{request.buyer}</span>
                        </div>
                        <div className="mp-row">
                          <span className="mp-label-sm">Payment</span>
                          <span>{request.paymentMethod ? request.paymentMethod.toUpperCase() : 'N/A'}</span>
                        </div>
                        {request.midmanFee > 0 && (
                          <div className="mp-row">
                            <span className="mp-label-sm">Midman Fee</span>
                            <span className="mp-price">{request.midmanFee}</span>
                          </div>
                        )}
                        {request.premium && (
                          <div className="mp-row">
                            <span className="mp-label-sm">Midman Fee</span>
                            <span className="mp-premium-tag">Waived</span>
                          </div>
                        )}
                        <div className="mp-row">
                          <span className="mp-label-sm">Status</span>
                          <span className={`mp-order-status mp-status-${request.status.toLowerCase()}`}>{request.status}</span>
                        </div>
                      </div>
                      <div className="mp-card-actions">
                        {request.status === 'Accepted' && (
                          <button className="mp-btn" style={{ width: 'auto', marginTop: '10px' }} onClick={() => setActiveChatId(request.id)}>
                            Open Chat
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeRequest && activeRequest.status === 'Accepted' && (
                <div className="mp-card" style={{ marginTop: '20px' }}>
                  <h3 style={{ marginBottom: '8px' }}>Conversation: {activeRequest.caption}</h3>
                  <p style={{ color: '#9a9ab0', marginBottom: '8px' }}>Buyer: {activeRequest.buyer} | Seller: {activeRequest.seller}</p>
                  <p style={{ color: '#9a9ab0', marginBottom: '12px' }}>Payment: {activeRequest.paymentMethod ? activeRequest.paymentMethod.toUpperCase() : 'N/A'} | Midman: {activeRequest.midman || 'Pending'}</p>
                  <div className="mp-card" style={{ minHeight: '240px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(10,15,30,0.6)' }}>
                    {(activeRequest.chat || []).map((entry, index) => (
                      <div key={`${activeRequest.id}-${index}`} className="mp-card" style={{ marginBottom: '0' }}>
                        <strong style={{ color: '#ffd666' }}>{entry.sender}:</strong>
                        <span style={{ color: '#e6e6f0', marginLeft: '6px' }}>{entry.message}</span>
                        {entry.image && (
                          <div style={{ marginTop: '8px' }}>
                            <img src={entry.image} alt="Chat attachment" style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '12px', border: '1px solid rgba(0,212,255,0.3)' }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleChatImageChange}
                        style={{ fontSize: '12px', color: '#a0b4c8' }}
                      />
                      {chatImage && (
                        <img src={chatImage} alt="Preview" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(0,212,255,0.3)' }} />
                      )}
                    </div>
                    <textarea
                      value={draftMessage}
                      onChange={(e) => setDraftMessage(e.target.value)}
                      placeholder="Type a message to the buyer and seller"
                      className="mp-input"
                      style={{ minHeight: '90px' }}
                    />
                    <button className="mp-btn" style={{ marginTop: '8px', width: 'auto' }} onClick={() => sendMessage(activeRequest.id)}>
                      Send Message
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <h3 style={{ marginBottom: '12px' }}>Your Transactions</h3>
              {myTransactions.length === 0 ? (
                <p className="mp-empty">No transactions yet.</p>
              ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {myTransactions.map((entry) => (
                    <div key={entry.id} className="mp-card" style={{ marginBottom: '0' }}>
                      <div className="mp-card-header">
                        {entry.premium && <span className="mp-premium-badge">⭐ Premium</span>}
                        <h3>{entry.caption}</h3>
                      </div>
                      <div className="mp-card-body">
                        <div className="mp-row">
                          <span className="mp-label-sm">Buyer</span>
                          <span>{entry.buyer}</span>
                        </div>
                        <div className="mp-row">
                          <span className="mp-label-sm">Seller</span>
                          <span>{entry.seller}</span>
                        </div>
                        <div className="mp-row">
                          <span className="mp-label-sm">Price</span>
                          <span className="mp-price">{entry.price}</span>
                        </div>
                        {entry.midmanFee > 0 && (
                          <div className="mp-row">
                            <span className="mp-label-sm">Midman Fee</span>
                            <span className="mp-price">{entry.midmanFee}</span>
                          </div>
                        )}
                        {entry.premium && (
                          <div className="mp-row">
                            <span className="mp-label-sm">Midman Fee</span>
                            <span className="mp-premium-tag">Waived</span>
                          </div>
                        )}
                        <div className="mp-row">
                          <span className="mp-label-sm">Status</span>
                          <span className={`mp-order-status mp-status-${entry.status.toLowerCase()}`}>{entry.status}</span>
                        </div>
                        <div className="mp-row">
                          <span className="mp-label-sm">Date</span>
                          <span>{entry.closedAt}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTrade ? (
        <div className="mp-card">
          <h3 style={{ marginBottom: '8px' }}>Checkout Order: {activeTrade.caption}</h3>
          {activeTrade.premium && (
            <p style={{ color: '#ffd666', marginBottom: '8px' }}>⭐ Premium listing — Midman fee waived.</p>
          )}
          <div className="mp-card-body">
            <div className="mp-row">
              <span className="mp-label-sm">Buyer</span>
              <span>{activeTrade.buyer || 'Pending buyer'}</span>
            </div>
            <div className="mp-row">
              <span className="mp-label-sm">Seller</span>
              <span>{activeTrade.seller}</span>
            </div>
            <div className="mp-row">
              <span className="mp-label-sm">Price</span>
              <span className="mp-price">{activeTrade.price}</span>
            </div>
            {!activeTrade.premium && (
              <div className="mp-row">
                <span className="mp-label-sm">Midman Fee</span>
                <span className="mp-price">{Math.max(10, Math.round((parseFloat(activeTrade.price) || 0) * 0.05))} credits</span>
              </div>
            )}
            {activeTrade.premium && (
              <div className="mp-row">
                <span className="mp-label-sm">Midman Fee</span>
                <span className="mp-price mp-price-waived">Waived</span>
              </div>
            )}
          </div>

          <div style={{ marginTop: '20px' }}>
            <h4 style={{ marginBottom: '10px', fontFamily: "'Cinzel', serif", color: '#ffd666' }}>Choose Payment Method</h4>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {[
                { id: 'gcash', label: 'GCash', bg: 'linear-gradient(135deg, #00a6ff, #0f4c81)', icon: 'G' },
                { id: 'maya', label: 'Maya', bg: 'linear-gradient(135deg, #7b2cbf, #ff4d97)', icon: 'M' }
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPaymentMethod(option.id)}
                  className="mp-card"
                  style={{
                    minWidth: '140px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    border: paymentMethod === option.id ? '2px solid rgba(255,215,0,0.6)' : '1px solid rgba(255,215,0,0.2)'
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
            <h4 style={{ marginBottom: '10px', fontFamily: "'Cinzel', serif", color: '#ffd666' }}>Select Midman</h4>
            <select
              value={selectedMidman}
              onChange={(e) => setSelectedMidman(e.target.value)}
              className="mp-input"
              style={{ maxWidth: '280px' }}
            >
              <option value="">Choose a midman</option>
              {midmen.map((midman) => (
                <option key={midman.id} value={midman.name}>{midman.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
            <button onClick={handleApprove} className="mp-btn" style={{ width: 'auto' }}>
              {isMiddlemanView ? 'Approve & Reveal Info' : 'Confirm Order'}
            </button>
            <button onClick={clearActiveTrade} className="mp-btn mp-btn-ghost" style={{ width: 'auto' }}>
              Back
            </button>
          </div>
        </div>
      ) : (
        <div className="mp-card">
          <p className="mp-empty">{!isMiddlemanView ? 'Choose an account to start a checkout request.' : 'No active trades currently.'}</p>
        </div>
      )}
    </div>
  );
}
