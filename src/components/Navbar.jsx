import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';

function Navbar({ user, setCurrentUser, middlemanUsers, notifications, getUnreadCount, markAllNotificationsRead }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/');
  };

  const isMiddleman = user?.role === 'middleman' || middlemanUsers?.includes(user?.username?.toLowerCase()) || user?.username === 'chrisford';
  const isDeveloper = user?.role === 'developer' || user?.username?.toLowerCase() === 'chrisford';
  const unreadCount = user ? getUnreadCount(user.username) : 0;

  return (
    <nav className="navbar">
      <Link to="/" className="logo">
        MLBB TradeGuard
      </Link>

      <div className="menu">
        <Link to="/">Home</Link>
        <Link to="/marketplace">Marketplace</Link>

        {user ? (
          <>
            <Link to="/profile">Profile</Link>
            <Link to="/midman">Chat</Link>
            {isDeveloper && (
              <>
                <Link to="/admin">Admin</Link>
                <Link to="/users">Users</Link>
              </>
            )}
            {isMiddleman && <Link to="/midman">Middleman</Link>}
            <button className="loginBtn" onClick={handleLogout}>
              Logout
            </button>
            {unreadCount > 0 && (
              <span className="mp-notification-badge" onClick={() => markAllNotificationsRead()}>
                🔔 {unreadCount}
              </span>
            )}
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register" className="signupBtn">
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;