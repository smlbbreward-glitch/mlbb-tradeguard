import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import '../styles/Marketplace.css';
import { apiCreatePost, apiCreateOrder, apiCreateMiddlemanRequest } from '../utils/api';
import { sanitizeFileName } from '../utils/files';

const encodePostToShare = (post) => {
  try {
    const json = JSON.stringify(post);
    return btoa(encodeURIComponent(json)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return null;
  }
};

const getShareUrl = (post) => {
  const encoded = encodePostToShare(post);
  if (!encoded) return null;
  return `${window.location.origin}/listing/${encoded}`;
};

const copyShareLink = async (post) => {
  const url = getShareUrl(post);
  if (!url) {
    alert('Failed to create share link. The listing may contain too much data.');
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    alert('Shareable link copied to clipboard! Send it to your friends.');
  } catch {
    prompt('Copy this link to share:', url);
  }
};

const PREMIUM_POST_FEE = 500;
const MIDMAN_FEE_RATE = 0.05;
const MIDMAN_FEE_MIN = 10;
const HERO_LIST = ['Miya','Balmond','Saber','Alice','Nana','Tigreal','Alucard','Karina','Akai','Franco','Bane','Bruno','Clint','Rafaela','Eudora','Zilong','Fanny','Layla','Minotaur','Lolita','Hayabusa','Freya','Gord','Natalia','Kagura','Chou','Sun','Alpha','Ruby','Yi Sun-shin','Moskov','Johnson','Cyclops','Estes','Hilda','Aurora','Lapu-Lapu','Vexana','Roger','Karrie','Gatotkaca','Harley','Irithel','Grock','Argus','Odette','Lancelot','Diggie','Hylos','Zhask','Helcurt','Pharsa','Lesley','Jawhead','Angela','Gusion','Valir','Martis','Uranus','Hanabi','Chang\'e','Kaja','Selena','Aldous','Claude','Vale','Leomord','Lunox','Hanzo','Belerick','Kimmy','Thamuz','Harith','Minsitthar','Kadita','Faramis','Badang','Khufra','Granger','Guinevere','Esmeralda','Terizla','X.Borg','Ling','Dyrroth','Lylia','Baxia','Masha','Wanwan','Silvanna','Cecilion','Carmilla','Atlas','Popol and Kupa','Yu Zhong','Luo Yi','Benedetta','Khaleed','Barats','Brody','Yve','Mathilda','Paquito','Gloo','Beatrix','Phoveus','Natan','Aulus','Aamon','Valentina','Edith','Floryn','Yin','Melissa','Xavier','Julian','Fredrinn','Joy','Novaria','Arlott','Ixia','Nolan','Cici','Chip','Zhuxin','Suyou','Lukas','Kalea','Zetian','Obsidia','Sora','Marcel','Hirara'];
export { HERO_LIST };

export default function MarketplaceNew({ user, setActiveTrade, marketplacePosts, setMarketplacePosts, middlemanRequests, setMiddlemanRequests, orderHistory, setOrderHistory, notifications, addNotification, markNotificationRead, getUnreadCount }) {
  const location = useLocation();
  const posts = marketplacePosts;
  const [activeTab, setActiveTab] = useState('browse');
  const [isPremium, setIsPremium] = useState(false);
  const POST_DRAFT_KEY = 'mlbb_post_draft';

  const loadDraft = () => {
    try {
      const saved = localStorage.getItem(POST_DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          caption: parsed.caption || '',
          price: parsed.price || '',
          rank: parsed.rank || '',
          mlId: parsed.mlId || '',
          serverId: parsed.serverId || '',
          securityLock: parsed.securityLock || '',
          files: [],
          hero: parsed.hero || ''
        };
      }
    } catch {}
    return null;
  };

  const [formData, setFormData] = useState(loadDraft() || { caption: '', price: '', rank: '', mlId: '', serverId: '', securityLock: '', files: [], hero: '' });
  const [previewFiles, setPreviewFiles] = useState([]);

  React.useEffect(() => {
    try {
      const { files, ...rest } = formData;
      localStorage.setItem(POST_DRAFT_KEY, JSON.stringify(rest));
    } catch {}
  }, [formData]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formError, setFormError] = useState('');
  const [selectedHero, setSelectedHero] = useState(location.state?.selectedHero || '');
  const [checkout, setCheckout] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('gcash');

  React.useEffect(() => {
    if (location.state?.selectedHero) {
      setSelectedHero(location.state.selectedHero);
    }
  }, [location.state?.selectedHero]);

  const isMidman = user?.role === 'middleman' || user?.role === 'developer' || user?.username === 'chrisford';
  const premiumPostFee = isPremium && !isMidman ? PREMIUM_POST_FEE : 0;

  const readFileAsDataUrl = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFormData((prev) => ({ ...prev, files: selectedFiles }));

    const preparedFiles = await Promise.all(
      selectedFiles.map(async (file) => ({
        name: sanitizeFileName(file.name),
        preview: file.type.startsWith('image/') ? await readFileAsDataUrl(file) : null,
        downloadUrl: await readFileAsDataUrl(file)
      }))
    );

    setPreviewFiles(preparedFiles);
  };

  const handlePost = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!user?.isVerified) {
      alert('⚠️ You must be verified before you can sell. Please verify your account first.');
      return;
    }

    if (isPremium && !isMidman) {
      const confirmed = confirm(`Premium posting requires ${PREMIUM_POST_FEE} credits. Do you want to proceed?`);
      if (!confirmed) return;
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
      caption: formData.caption,
      price: formData.price,
      rank: formData.rank,
      hero: formData.hero,
      mlId: mlIdValue,
      serverId: serverIdValue,
      securityLock: formData.securityLock,
      platform: 'Mobile Legends',
      premium: isPremium,
      files: previewFiles.map((file) => ({
        name: file.name,
        preview: file.preview,
        downloadUrl: file.downloadUrl
      }))
    };

    try {
      await apiCreatePost(listing);
      if (setMarketplacePosts) await setMarketplacePosts();
    } catch (e) {
      alert(e.message || 'Failed to create listing');
      return;
    }
    try { localStorage.removeItem(POST_DRAFT_KEY); } catch {}
    setFormData({ caption: '', price: '', rank: '', mlId: '', serverId: '', securityLock: '', files: [], hero: '' });
    setPreviewFiles([]);
    setActiveTab('browse');
  };

  const handleBuyNow = (post) => {
    if (!user) {
      alert('Please log in to purchase.');
      return;
    }
    setCheckout(post);
    setPaymentMethod('gcash');
  };

  const confirmOrder = async () => {
    if (!checkout || !user) return;

    const post = checkout;
    const order = {
      postId: post.id,
      caption: post.caption,
      price: post.price,
      seller: post.seller,
      buyer: user.username,
      rank: post.rank,
      mlId: post.mlId,
      serverId: post.serverId,
      platform: post.platform,
      hero: post.hero,
      premium: post.premium,
      files: post.files || [],
      paymentMethod,
      status: 'pending'
    };

    const midmanRequest = {
      postId: post.id,
      caption: post.caption || 'Marketplace request',
      buyer: user.username,
      seller: post.seller,
      price: post.price,
      paymentMethod,
      midman: 'Pending',
      hero: post.hero,
      premium: post.premium,
      midmanFee: post.premium ? 0 : Math.max(MIDMAN_FEE_MIN, Math.round((parseFloat(post.price) || 0) * MIDMAN_FEE_RATE))
    };

    try {
      await apiCreateOrder(order);
      await apiCreateMiddlemanRequest(midmanRequest);
      if (setOrderHistory) await setOrderHistory();
      if (setMiddlemanRequests) await setMiddlemanRequests();
    } catch (e) {
      alert(e.message || 'Failed to place order');
      return;
    }

    setCheckout(null);
    alert('✅ Order placed successfully! A midman will review your order shortly.');
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const matches = posts.filter((post) => {
      if (post.status === 'sold') return false;
      if (selectedHero && post.hero !== selectedHero) return false;
      if (!term) return true;
      return [post.seller, post.caption, post.rank, post.platform, post.hero]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
    return matches.sort((a, b) => (b.premium ? 1 : 0) - (a.premium ? 1 : 0));
  }, [posts, searchTerm, selectedHero]);

  const myOrders = useMemo(() => {
    if (!user) return [];
    return orderHistory.filter((o) => o.buyer === user.username || o.seller === user.username);
  }, [orderHistory, user]);

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
          MLBB Buy Market
        </h1>
        <p>Secure trades. Fast buys. Legendary deals.</p>
      </div>

      {!user && (
        <div className="mp-banner">Please log in to browse or create a listing.</div>
      )}
      {user && !user.isVerified && (
        <div className="mp-banner">
          ⚠️ Verify your account first. You cannot sell listings until verification is approved.
        </div>
      )}

      <div className="mp-stepper">
        <button
          className={`mp-step ${activeTab === 'browse' ? 'mp-step-active' : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          <span className="mp-step-badge">01</span>
          Browse
        </button>
        <button
          className={`mp-step ${activeTab === 'post' ? 'mp-step-active' : ''}`}
          onClick={() => {
            setIsPremium(false);
            setActiveTab('post');
          }}
        >
          <span className="mp-step-badge">02</span>
          Post
        </button>
        <button
          className={`mp-step ${activeTab === 'orders' ? 'mp-step-active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <span className="mp-step-badge">03</span>
          Orders
        </button>
      </div>

      <div className="mp-tabs">
        <button
          onClick={() => setActiveTab('browse')}
          className={`mp-tab ${activeTab === 'browse' ? 'mp-tab-active' : ''}`}
        >
          Browse Accounts
        </button>
        <button
          onClick={() => { setIsPremium(true); setActiveTab('post'); }}
          className={`mp-tab ${activeTab === 'post' && isPremium ? 'mp-tab-active' : ''}`}
        >
          ⭐ Premium Post
        </button>
        <button
          onClick={() => { setIsPremium(false); setActiveTab('post'); }}
          className={`mp-tab ${activeTab === 'post' && !isPremium ? 'mp-tab-active' : ''}`}
        >
          Post Account
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`mp-tab ${activeTab === 'orders' ? 'mp-tab-active' : ''}`}
        >
          📜 Order History
        </button>
      </div>

      {activeTab === 'post' ? (
        <form onSubmit={handlePost} className="mp-card">
          <h2>{isPremium ? 'Post Premium Account' : 'Post Your Account'}</h2>
          <p className="mp-subtitle">
            {isPremium
              ? isMidman
                ? 'Premium listing — waived for verified midmen.'
                : `Your listing will be highlighted and shown at the top. Premium fee: ${PREMIUM_POST_FEE} credits.`
              : 'Only Mobile Legends accounts are allowed here.'}
          </p>
          {formError && <p className="mp-error">{formError}</p>}

          <div className="mp-grid">
            <input
              className="mp-input"
              placeholder="Caption"
              required
              value={formData.caption}
              onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
            />
            <input
              className="mp-input"
              placeholder="Price"
              required
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
            <select
              className="mp-input"
              required
              value={formData.rank}
              onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
            >
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

            <select
              className="mp-input"
              required
              value={formData.hero}
              onChange={(e) => setFormData({ ...formData, hero: e.target.value })}
            >
              <option value="">Select Main Hero</option>
              {HERO_LIST.map((hero) => (
                <option key={hero} value={hero}>{hero}</option>
              ))}
            </select>

            <input
              className="mp-input"
              placeholder="ML ID (8 to 10 digits)"
              required
              inputMode="numeric"
              pattern="[0-9]*"
              value={formData.mlId}
              onChange={(e) => setFormData({ ...formData, mlId: e.target.value })}
            />
            <input
              className="mp-input"
              placeholder="Server ID (3 to 5 digits)"
              required
              inputMode="numeric"
              pattern="[0-9]*"
              value={formData.serverId}
              onChange={(e) => setFormData({ ...formData, serverId: e.target.value })}
            />
            <input
              className="mp-input"
              placeholder="Security Lock (Days, optional)"
              value={formData.securityLock}
              onChange={(e) => setFormData({ ...formData, securityLock: e.target.value })}
            />
          </div>

          <label className="mp-label">Add photos or files (you can add multiple)</label>
          <input
            className="mp-input"
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            required
            onChange={handleFileChange}
          />

          {previewFiles.length > 0 && (
            <div className="mp-preview-list">
              {previewFiles.map((file, index) => (
                <div className="mp-preview-item" key={index}>
                  {file.preview ? (
                    <img src={file.preview} alt={file.name} />
                  ) : (
                    <span>{file.name}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {isPremium && !isMidman && (
            <div className="mp-premium-fee">
              <span className="mp-premium-fee-label">Premium Post Fee</span>
              <span className="mp-premium-fee-amount">{PREMIUM_POST_FEE} credits</span>
            </div>
          )}
          {isPremium && isMidman && (
            <div className="mp-premium-fee mp-premium-fee-waived">
              <span className="mp-premium-fee-label">Premium Post Fee</span>
              <span className="mp-premium-fee-amount">Waived — Midman Privilege</span>
            </div>
          )}

          <button type="submit" className="mp-btn">
            <span className="mp-btn-shimmer" />
            {isPremium && !isMidman ? `Publish Premium (${PREMIUM_POST_FEE} credits)` : 'Publish Listing'}
          </button>
        </form>
      ) : activeTab === 'orders' ? (
        <div className="mp-card mp-orders-card">
          <h2>Order History</h2>
          <p className="mp-subtitle">Track your marketplace purchases and sales.</p>

          {!user ? (
            <p className="mp-empty">Please log in to view your orders.</p>
          ) : myOrders.length === 0 ? (
            <div className="mp-empty-state">
              <span className="mp-empty-icon">📜</span>
              <p>No orders yet.</p>
              <button className="mp-btn mp-btn-ghost" onClick={() => setActiveTab('browse')}>Browse Accounts</button>
            </div>
          ) : (
            <div className="mp-orders-list">
              {myOrders.map((order) => (
                <div key={order.id} className={`mp-order-item ${order.status === 'completed' ? 'mp-order-completed' : ''} ${order.status === 'cancelled' ? 'mp-order-cancelled' : ''}`}>
                  <div className="mp-order-header">
                    <span className="mp-order-id">#{String(order.id).slice(-6)}</span>
                    <span className={`mp-order-status mp-status-${order.status}`}>{order.status}</span>
                  </div>
                  <div className="mp-order-body">
                    <div className="mp-row">
                      <span className="mp-label-sm">Caption</span>
                      <span>{order.caption}</span>
                    </div>
                    <div className="mp-row">
                      <span className="mp-label-sm">Price</span>
                      <span className="mp-price">{order.price}</span>
                    </div>
                    {order.paymentMethod && (
                      <div className="mp-row">
                        <span className="mp-label-sm">Payment</span>
                        <span>{order.paymentMethod.toUpperCase()}</span>
                      </div>
                    )}
                    {order.midmanFee > 0 && (
                      <div className="mp-row">
                        <span className="mp-label-sm">Midman Fee</span>
                        <span className="mp-price">{order.midmanFee}</span>
                      </div>
                    )}
                    {order.premium && (
                      <div className="mp-row">
                        <span className="mp-label-sm">Premium</span>
                        <span className="mp-premium-tag">⭐ Premium — No Midman Fee</span>
                      </div>
                    )}
                    <div className="mp-row">
                      <span className="mp-label-sm">{order.buyer === user.username ? 'Seller' : 'Buyer'}</span>
                      <span>{order.buyer === user.username ? order.seller : order.buyer}</span>
                    </div>
                    <div className="mp-row">
                      <span className="mp-label-sm">Rank</span>
                      <span>{order.rank}</span>
                    </div>
                    {order.hero && (
                      <div className="mp-row">
                        <span className="mp-label-sm">Main Hero</span>
                        <span>{order.hero}</span>
                      </div>
                    )}
                    <div className="mp-row">
                      <span className="mp-label-sm">ML ID</span>
                      <span>{order.mlId}</span>
                    </div>
                    <div className="mp-row">
                      <span className="mp-label-sm">Server</span>
                      <span>{order.serverId}</span>
                    </div>
                    <div className="mp-row">
                      <span className="mp-label-sm">Date</span>
                      <span>{new Date(order.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {order.files?.length > 0 && (
                    <div className="mp-order-gallery">
                      {order.files.map((file, index) => (
                        <div key={index} className="mp-order-gallery-item">
                          {file.preview ? (
                            <img src={file.preview} alt={file.name} />
                          ) : (
                            <a href={file.downloadUrl} target="_blank" rel="noreferrer" className="mp-attachment">
                              {file.name}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mp-order-actions">
                    {order.status === 'pending' && (order.buyer === user.username || order.seller === user.username) && (
                      <button className="mp-btn mp-btn-ghost" onClick={() => {
                        setOrderHistory((prev) => prev.filter((o) => o.id !== order.id));
                        setMarketplacePosts((prev) => prev.map((p) => (p.id === order.postId ? { ...p, status: 'available' } : p)));
                      }}>Cancel</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mp-browse">
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <input
              className="mp-input"
              placeholder="Search seller or caption"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1, minWidth: '200px' }}
            />
            <select
              className="mp-input"
              value={selectedHero}
              onChange={(e) => setSelectedHero(e.target.value)}
              style={{ minWidth: '180px' }}
            >
              <option value="">All Heroes</option>
              {HERO_LIST.map((hero) => (
                <option key={hero} value={hero}>{hero}</option>
              ))}
            </select>
          </div>

          {selectedHero && (
            <div className="mp-banner" style={{ marginBottom: '16px' }}>
              Filtering by: <strong>{selectedHero}</strong> main accounts
              <button
                onClick={() => setSelectedHero('')}
                style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#ffd666', cursor: 'pointer', fontSize: '18px' }}
              >
                ×
              </button>
            </div>
          )}

          {filtered.length === 0 ? (
            <p className="mp-empty">No accounts listed yet.</p>
          ) : (
            filtered.map((p, idx) => (
              <div
                key={p.id}
                className={`mp-card mp-card-listing ${p.premium ? 'mp-card-premium' : ''}`}
                style={{ animationDelay: `${idx * 0.06}s` }}
              >
                <div className="mp-card-header">
                  {p.premium && <span className="mp-premium-badge">⭐ Premium</span>}
                  <h3>{p.caption}</h3>
                </div>

                <div className="mp-card-body">
                  <div className="mp-row">
                    <span className="mp-label-sm">Price</span>
                    <span className="mp-price">{p.price}</span>
                  </div>
                  <div className="mp-row">
                    <span className="mp-label-sm">Seller</span>
                    <span>{p.seller}</span>
                  </div>
                  <div className="mp-row">
                    <span className="mp-label-sm">Rank</span>
                    <span>{p.rank}</span>
                  </div>
                  {p.hero && (
                    <div className="mp-row">
                      <span className="mp-label-sm">Main Hero</span>
                      <span>{p.hero}</span>
                    </div>
                  )}
                  <div className="mp-row">
                    <span className="mp-label-sm">ML ID</span>
                    <span>{p.mlId}</span>
                  </div>
                  <div className="mp-row">
                    <span className="mp-label-sm">Server</span>
                    <span>{p.serverId}</span>
                  </div>
                  {p.securityLock ? (
                    <div className="mp-row">
                      <span className="mp-label-sm">Lock</span>
                      <span>{p.securityLock} days</span>
                    </div>
                  ) : null}
                </div>

                {p.files?.length > 0 && (
                  <div className="mp-gallery">
                    {p.files.map((file, index) => (
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
                  {p.seller?.toLowerCase() === user?.username?.toLowerCase() ? (
                    <button className="mp-btn mp-btn-ghost" disabled>Your Listing</button>
                  ) : p.status === 'pending' ? (
                    <button className="mp-btn mp-btn-ghost" disabled>Pending</button>
                  ) : (
                    <button
                      className="mp-btn"
                      onClick={() => handleBuyNow(p)}
                    >
                       ⚡ Buy Now
                    </button>
                  )}
                  <button
                    className="mp-btn mp-btn-ghost"
                    onClick={() => copyShareLink(p)}
                    title="Copy shareable link"
                  >
                    🔗 Share
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {checkout && createPortal(
        <div className="mp-checkout-overlay">
          <div className="mp-checkout-panel">
            <h2>Confirm Order</h2>
            <p className="mp-subtitle">You are about to order <strong>{checkout.caption}</strong></p>

            <div className="mp-checkout-grid">
              <div className="mp-row">
                <span className="mp-label-sm">Price</span>
                <span className="mp-price">{checkout.price}</span>
              </div>
              {checkout.premium ? (
                <div className="mp-row">
                  <span className="mp-label-sm">Midman Fee</span>
                  <span className="mp-price mp-price-waived">Waived — Premium</span>
                </div>
              ) : (
                <div className="mp-row">
                  <span className="mp-label-sm">Midman Fee</span>
                  <span className="mp-price">{Math.max(MIDMAN_FEE_MIN, Math.round((parseFloat(checkout.price) || 0) * MIDMAN_FEE_RATE))} credits</span>
                </div>
              )}
              <div className="mp-row">
                <span className="mp-label-sm">Seller</span>
                <span>{checkout.seller}</span>
              </div>
              {checkout.hero && (
                <div className="mp-row">
                  <span className="mp-label-sm">Main Hero</span>
                  <span>{checkout.hero}</span>
                </div>
              )}
            </div>

            <div style={{ marginTop: '18px' }}>
              <h4 style={{ marginBottom: '10px', fontFamily: "'Cinzel', serif", color: '#ffd666' }}>Payment Method</h4>
              <div className="mp-payment-options">
                {[
                  { id: 'gcash', label: 'GCash', icon: 'G' },
                  { id: 'maya', label: 'Maya', icon: 'M' },
                  { id: 'others', label: 'Others', icon: 'O' }
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setPaymentMethod(option.id)}
                    className={`mp-payment-btn ${paymentMethod === option.id ? 'mp-payment-btn-active' : ''}`}
                  >
                    <span className="mp-payment-icon">{option.icon}</span>
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mp-modal-actions">
              <button className="mp-btn mp-btn-ghost" onClick={() => setCheckout(null)}>Cancel</button>
              <button className="mp-btn" onClick={confirmOrder}>
                Confirm Order
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
