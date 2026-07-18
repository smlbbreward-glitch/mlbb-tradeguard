import { useState, useEffect, useCallback } from 'react';
import {
  apiGetMarketplacePosts,
  apiGetOrders,
  apiGetMiddlemanRequests,
  apiGetTransactions,
  apiGetNotifications,
  apiGetUsers,
  apiGetVerifications,
  apiAcceptRequest,
  apiSendRequestMessage,
  apiCloseRequest,
  apiDeleteRequest,
  apiCreateNotification,
  apiResetAllData
} from '../utils/api';

export function useBackendData(user) {
  const [posts, setPosts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const refreshPosts = useCallback(async () => {
    try { setPosts(await apiGetMarketplacePosts()); } catch (e) { console.error(e); }
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [p, o, r, t, n, v] = await Promise.all([
        apiGetMarketplacePosts(),
        apiGetOrders(),
        apiGetMiddlemanRequests(),
        apiGetTransactions(),
        apiGetNotifications(),
        apiGetVerifications().catch(() => [])
      ]);
      setPosts(p);
      setOrders(o);
      setRequests(r);
      setTransactions(t);
      setNotifications(n);
      setVerifications(v);
    } catch (e) {
      console.error('refresh failed', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshOrders = useCallback(async () => {
    if (!user) return;
    try {
      const o = await apiGetOrders();
      setOrders(o);
    } catch (e) {
      console.error('refreshOrders failed', e);
    }
  }, [user]);

  const refreshRequests = useCallback(async () => {
    if (!user) return;
    try {
      const r = await apiGetMiddlemanRequests();
      setRequests(r);
    } catch (e) {
      console.error('refreshRequests failed', e);
    }
  }, [user]);

  const refreshUsers = useCallback(async () => {
    if (!user) return;
    try {
      const userList = await apiGetUsers();
      setUsers(userList);
    } catch (e) {
      console.error('refreshUsers failed', e);
    }
  }, [user]);

  const refreshVerifications = useCallback(async () => {
    if (!user) return;
    try {
      const list = await apiGetVerifications();
      setVerifications(list);
    } catch (e) {
      console.error('refreshVerifications failed', e);
    }
  }, [user]);

  useEffect(() => {
    refreshPosts();
  }, [refreshPosts]);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  const addNotification = useCallback(async (username, message, type = 'info') => {
    try {
      const n = await apiCreateNotification({ message, type });
      if (n.username?.toLowerCase() === user?.username?.toLowerCase()) {
        setNotifications((prev) => [n, ...prev]);
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const acceptRequest = useCallback(async (id) => {
    const updated = await apiAcceptRequest(id);
    setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  }, []);

  const sendMessage = useCallback(async (id, message) => {
    const updated = await apiSendRequestMessage(id, message);
    setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  }, []);

  const closeRequest = useCallback(async (id, outcome) => {
    const tx = await apiCloseRequest(id, outcome);
    setRequests((prev) => prev.filter((r) => r.id !== id));
    setTransactions((prev) => [tx, ...prev]);
    await refresh();
    return tx;
  }, [refresh]);

  const deleteRequest = useCallback(async (id) => {
    await apiDeleteRequest(id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const markNotificationRead = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const getUnreadCount = useCallback((username) => {
    const normalized = username?.toLowerCase();
    return notifications.filter((n) => n.username?.toLowerCase() === normalized && !n.read).length;
  }, [notifications]);

  const resetAllData = useCallback(async () => {
    try {
      await apiResetAllData();
      setPosts([]);
      setOrders([]);
      setRequests([]);
      setTransactions([]);
      setNotifications([]);
      setUsers([]);
      setVerifications([]);
    } catch (e) {
      console.error('reset failed', e);
      throw e;
    }
  }, []);

  return {
    posts, setPosts, orders, setOrders, requests, setRequests,
    transactions, setTransactions, notifications, setNotifications, users, setUsers,
    verifications, setVerifications,
    loading, refresh, refreshPosts, refreshOrders, refreshRequests, refreshUsers, refreshVerifications, addNotification,
    acceptRequest, sendMessage, closeRequest, deleteRequest,
    markNotificationRead, markAllNotificationsRead, getUnreadCount,
    resetAllData
  };
}
