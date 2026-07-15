import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Marketplace from './pages/Marketplace';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import Verification from './pages/Verification';
import MidmanHub from './pages/MidmanHub';
import Admin from './pages/Admin';
import UserManagement from './pages/UserManagement';
import TransactionHistory from './pages/TransactionHistory';

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1526558602091958374/T9iBCYM-AWtE7pG-x80rCt17LNeYjL2_CUmsBi-GJ96cgIxq3y2Hm4Ibp9RlaCCs89Ad';
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser) return null;

    try {
      return JSON.parse(savedUser);
    } catch {
      return null;
    }
  });
  const [registeredUser, setRegisteredUser] = useState(() => {
    const savedUser = localStorage.getItem('registeredUser');
    if (!savedUser) return null;

    try {
      return JSON.parse(savedUser);
    } catch {
      return null;
    }
  });
  const [pendingRequests, setPendingRequests] = useState(() => {
    const savedRequests = localStorage.getItem('pendingRequests');
    return savedRequests ? JSON.parse(savedRequests) : [];
  });
  const [middlemanRequests, setMiddlemanRequests] = useState(() => {
    const savedRequests = localStorage.getItem('middlemanRequests');
    return savedRequests ? JSON.parse(savedRequests) : [];
  });
  const [middlemanUsers, setMiddlemanUsers] = useState(() => {
    const savedMiddlemen = localStorage.getItem('middlemanUsers');
    return savedMiddlemen ? JSON.parse(savedMiddlemen) : [];
  });
  const [marketplacePosts, setMarketplacePosts] = useState(() => {
    const savedPosts = localStorage.getItem('marketplacePosts');
    return savedPosts ? JSON.parse(savedPosts) : [];
  });
  const [userAccounts, setUserAccounts] = useState(() => {
    const savedAccounts = localStorage.getItem('userAccounts');
    if (savedAccounts) {
      try {
        return JSON.parse(savedAccounts);
      } catch {
        return [];
      }
    }

    const savedUser = localStorage.getItem('registeredUser');
    if (!savedUser) return [];

    try {
      const parsedUser = JSON.parse(savedUser);
      return parsedUser?.username ? [parsedUser] : [];
    } catch {
      return [];
    }
  });
  const [activeTrade, setActiveTrade] = useState(null);
  const [transactionHistory, setTransactionHistory] = useState(() => {
    const savedHistory = localStorage.getItem('transactionHistory');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });
  const isDeveloper = currentUser?.role === 'developer' || currentUser?.username === 'chrisford';
  const isMiddleman = currentUser?.role === 'middleman' || middlemanUsers.includes(currentUser?.username?.toLowerCase());
  const canAccessMiddleman = isDeveloper || isMiddleman;

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  useEffect(() => {
    if (registeredUser) {
      localStorage.setItem('registeredUser', JSON.stringify(registeredUser));
    } else {
      localStorage.removeItem('registeredUser');
    }
  }, [registeredUser]);

  useEffect(() => {
    localStorage.setItem('pendingRequests', JSON.stringify(pendingRequests));
  }, [pendingRequests]);

  useEffect(() => {
    if (userAccounts.length) {
      localStorage.setItem('userAccounts', JSON.stringify(userAccounts));
    } else {
      localStorage.removeItem('userAccounts');
    }
  }, [userAccounts]);

  useEffect(() => {
    localStorage.setItem('marketplacePosts', JSON.stringify(marketplacePosts));
  }, [marketplacePosts]);

  useEffect(() => {
    localStorage.setItem('middlemanRequests', JSON.stringify(middlemanRequests));
  }, [middlemanRequests]);

  useEffect(() => {
    localStorage.setItem('middlemanUsers', JSON.stringify(middlemanUsers));
  }, [middlemanUsers]);

  useEffect(() => {
    localStorage.setItem('transactionHistory', JSON.stringify(transactionHistory));
  }, [transactionHistory]);

  const syncUserState = (username, updates) => {
    setCurrentUser((prev) =>
      prev && prev.username === username
        ? { ...prev, ...updates }
        : prev
    );
    setRegisteredUser((prev) =>
      prev && prev.username === username
        ? { ...prev, ...updates }
        : prev
    );
    setUserAccounts((prev) =>
      prev.map((account) =>
        account.username.toLowerCase() === username.toLowerCase()
          ? { ...account, ...updates }
          : account
      )
    );
  };

  const sendDiscordStatus = async (username, decision, note = '') => {
    try {
      await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `Verification ${decision} for **${username}**.${note ? `\nNote: ${note}` : ''}`
        })
      });
    } catch (error) {
      console.error('Discord status update failed:', error);
    }
  };

  const approveUser = async (username) => {
    const approvedUser = {
      username,
      isVerified: true,
      verificationStatus: 'approved',
      cooldownUntil: null,
      declineReason: ''
    };

    const cooldownData = JSON.parse(localStorage.getItem('cooldownData') || '{}');
    delete cooldownData[username];
    localStorage.setItem('cooldownData', JSON.stringify(cooldownData));

    syncUserState(username, approvedUser);
    setPendingRequests((prev) => prev.filter((request) => request.username !== username));
    await sendDiscordStatus(username, 'approved');
  };

  const declineUser = async (username, reason = 'No further details provided.') => {
    const cooldownUntil = Date.now() + COOLDOWN_MS;
    const declinedUser = {
      username,
      isVerified: false,
      verificationStatus: 'declined',
      cooldownUntil,
      declineReason: reason
    };

    const cooldownData = JSON.parse(localStorage.getItem('cooldownData') || '{}');
    cooldownData[username] = {
      cooldownUntil,
      reason,
      status: 'declined',
      updatedAt: Date.now()
    };
    localStorage.setItem('cooldownData', JSON.stringify(cooldownData));

    syncUserState(username, declinedUser);
    setPendingRequests((prev) => prev.filter((request) => request.username !== username));
    await sendDiscordStatus(username, 'declined', `Reapply after ${new Date(cooldownUntil).toLocaleString()}. ${reason}`);
  };

  const deleteUserAccount = (usernameToDelete) => {
    setUserAccounts((prev) => prev.filter((account) => account.username.toLowerCase() !== usernameToDelete.toLowerCase()));
    setCurrentUser((prev) => (prev?.username?.toLowerCase() === usernameToDelete.toLowerCase() ? null : prev));
  };

  return (
    <Router>
      <Navbar user={currentUser} setCurrentUser={setCurrentUser} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/marketplace" element={currentUser ? <Marketplace user={currentUser} setActiveTrade={setActiveTrade} marketplacePosts={marketplacePosts} setMarketplacePosts={setMarketplacePosts} /> : <Navigate to="/login" replace />} />
        <Route path="/profile" element={currentUser ? <Profile user={currentUser} marketplacePosts={marketplacePosts} setMarketplacePosts={setMarketplacePosts} transactionHistory={transactionHistory} /> : <Navigate to="/login" replace />} />
        <Route path="/login" element={<Login registeredUser={registeredUser} userAccounts={userAccounts} setCurrentUser={setCurrentUser} />} />
        <Route path="/register" element={<Register setRegisteredUser={setRegisteredUser} setUserAccounts={setUserAccounts} />} />
        <Route path="/verify" element={currentUser ? <Verification user={currentUser} setCurrentUser={setCurrentUser} setPendingRequests={setPendingRequests} /> : <Navigate to="/login" replace />} />
        <Route path="/midman" element={currentUser ? <MidmanHub currentUser={currentUser} activeTrade={activeTrade} setTradeData={setActiveTrade} middlemanRequests={middlemanRequests} setMiddlemanRequests={setMiddlemanRequests} setTransactionHistory={setTransactionHistory} setMarketplacePosts={setMarketplacePosts} /> : <Navigate to="/login" replace />} />
        <Route path="/admin" element={isDeveloper ? <Admin pendingRequests={pendingRequests} setPendingRequests={setPendingRequests} approveUser={approveUser} declineUser={declineUser} /> : <Navigate to="/login" replace />} />
        <Route path="/users" element={isDeveloper ? <UserManagement userAccounts={userAccounts} setUserAccounts={setUserAccounts} setCurrentUser={setCurrentUser} deleteUserAccount={deleteUserAccount} middlemanUsers={middlemanUsers} setMiddlemanUsers={setMiddlemanUsers} /> : <Navigate to="/login" replace />} />
        <Route path="/transactions" element={currentUser ? <TransactionHistory currentUser={currentUser} transactionHistory={transactionHistory} /> : <Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;