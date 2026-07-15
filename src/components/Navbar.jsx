import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';

function Navbar({ user, setCurrentUser }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/');
  };

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
            {user.role === 'developer' && (
              <>
                <Link to="/admin">Admin</Link>
                <Link to="/users">Users</Link>
              </>
            )}
            {(user.role === 'middleman' || user.username === 'chrisford') && <Link to="/midman">Middleman</Link>}
            <button className="loginBtn" onClick={handleLogout}>
              Logout
            </button>
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