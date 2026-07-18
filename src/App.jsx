import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Marketplace from './pages/Marketplace.new';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import Verification from './pages/Verification';
import MidmanHub from './pages/MidmanHub';
import Admin from './pages/Admin';
import UserManagement from './pages/UserManagement';
import TransactionHistory from './pages/TransactionHistory';
import ShareListing from './pages/ShareListing';
import { useBackendData } from './hooks/useData';
import { apiHeartbeat, apiGetOnlineUsers } from './utils/api';

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });
  const [middlemanUsers, setMiddlemanUsers] = useState(() => {
    const saved = localStorage.getItem('middlemanUsers');
    return saved ? JSON.parse(saved) : [];
  });
  const [onlineUsers, setOnlineUsers] = useState([]);

  const data = useBackendData(currentUser);

  const isDeveloper = currentUser?.role === 'developer' || currentUser?.role === 'admin' || currentUser?.username?.toLowerCase() === 'chrisford';

  useEffect(() => {
    try {
      if (currentUser) localStorage.setItem('currentUser', JSON.stringify(currentUser));
      else localStorage.removeItem('currentUser');
    } catch (e) { console.warn('LocalStorage write failed:', e); }
  }, [currentUser]);

  useEffect(() => {
    try { localStorage.setItem('middlemanUsers', JSON.stringify(middlemanUsers)); } catch (e) {}
  }, [middlemanUsers]);

  useEffect(() => {
    if (!currentUser) return;
    let alive = true;
    const tick = async () => {
      try {
        await apiHeartbeat();
        const online = await apiGetOnlineUsers();
        if (alive) setOnlineUsers(online);
      } catch {}
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => { alive = false; clearInterval(id); };
  }, [currentUser]);

  const deleteUserAccount = (usernameToDelete) => {
    setCurrentUser((prev) => (prev?.username?.toLowerCase() === usernameToDelete.toLowerCase() ? null : prev));
  };

  const isUserOnline = (username) => {
    if (!username) return false;
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    return onlineUsers.some((u) => u.username?.toLowerCase() === username.toLowerCase() && u.last_seen && new Date(u.last_seen).getTime() > twoMinutesAgo);
  };

  return (
    <Router>
      <Analytics />
      <Navbar user={currentUser} setCurrentUser={setCurrentUser} middlemanUsers={middlemanUsers} notifications={data.notifications} getUnreadCount={data.getUnreadCount} markAllNotificationsRead={data.markAllNotificationsRead} onlineCount={onlineUsers.length} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/marketplace" element={<Marketplace user={currentUser} marketplacePosts={data.posts} setMarketplacePosts={data.refreshPosts} middlemanRequests={data.requests} setMiddlemanRequests={data.refreshRequests} orderHistory={data.orders} setOrderHistory={data.refreshOrders} notifications={data.notifications} addNotification={data.addNotification} markNotificationRead={data.markNotificationRead} getUnreadCount={data.getUnreadCount} />} />
        <Route path="/listing/:encodedData" element={<ShareListing />} />
        <Route path="/profile" element={currentUser ? <Profile user={currentUser} marketplacePosts={data.posts} setMarketplacePosts={data.setPosts} transactionHistory={data.transactions} data={data} /> : <Navigate to="/login" replace />} />
        <Route path="/login" element={<Login setCurrentUser={setCurrentUser} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={currentUser ? <Verification user={currentUser} setCurrentUser={setCurrentUser} data={data} /> : <Navigate to="/login" replace />} />
        <Route path="/midman" element={currentUser ? <MidmanHub currentUser={currentUser} activeTrade={null} setTradeData={() => {}} middlemanRequests={data.requests} setMiddlemanRequests={data.setRequests} setTransactionHistory={data.setTransactions} setMarketplacePosts={data.setPosts} orderHistory={data.orders} setOrderHistory={data.setOrders} middlemanUsers={middlemanUsers} addNotification={data.addNotification} notifications={data.notifications} transactionHistory={data.transactions} data={data} /> : <Navigate to="/login" replace />} />
        <Route path="/admin" element={isDeveloper ? <Admin data={data} verifications={data.verifications} resetAllData={data.resetAllData} /> : <Navigate to="/marketplace" replace />} />
        <Route path="/users" element={isDeveloper ? <UserManagement currentUser={currentUser} userAccounts={data.users || []} setCurrentUser={setCurrentUser} deleteUserAccount={deleteUserAccount} middlemanUsers={middlemanUsers} setMiddlemanUsers={setMiddlemanUsers} data={data} isUserOnline={isUserOnline} /> : <Navigate to="/marketplace" replace />} />
        <Route path="/transactions" element={currentUser ? <TransactionHistory currentUser={currentUser} transactionHistory={data.transactions} /> : <Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
