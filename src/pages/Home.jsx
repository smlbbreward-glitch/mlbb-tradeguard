import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HERO_LIST } from '../pages/Marketplace.new';
import '../styles/Marketplace.css';

export default function Home() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHero, setSelectedHero] = useState('');

  const handleHeroClick = (hero) => {
    setSelectedHero(hero);
    navigate('/marketplace', { state: { selectedHero: hero } });
  };

  const filteredHeroes = HERO_LIST.filter((hero) =>
    hero.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '900px', textAlign: 'center' }}>
        <div className="mp-logo-icon" style={{ fontSize: '64px', marginBottom: '16px', animation: 'logoGlow 3s ease-in-out infinite', filter: 'drop-shadow(0 0 30px rgba(255, 215, 0, 0.8))' }}>
          ⚔️
        </div>
        <h1 style={{ 
          fontFamily: "'Cinzel', serif", 
          fontSize: '48px', 
          fontWeight: 700,
          letterSpacing: '3px',
          background: 'linear-gradient(135deg, #ffd666 0%, #ffaa00 25%, #ffd666 50%, #00d4ff 75%, #ffd666 100%)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '16px',
          animation: 'titleShimmer 4s linear infinite',
          textShadow: '0 0 60px rgba(255, 215, 0, 0.3)'
        }}>
          MLBB TRADEGUARD
        </h1>
        <p style={{ 
          color: '#7ec8e3', 
          fontSize: '16px', 
          textAlign: 'center', 
          lineHeight: 1.6,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          marginBottom: '32px',
          textShadow: '0 0 20px rgba(0, 212, 255, 0.3)'
        }}>
          Secure Trading Ecosystem for Mobile Legends Players
        </p>

        <div className="mp-heroes-section" style={{ textAlign: 'left' }}>
          <h2 className="mp-heroes-title">Choose Your Hero</h2>
          <p className="mp-heroes-subtitle">Select a hero to browse accounts for that main</p>
          
          <input
            className="mp-input"
            placeholder="Search hero name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ marginBottom: '16px' }}
          />

          <div className="mp-heroes-grid">
            {filteredHeroes.slice(0, 30).map((name, index) => (
              <div
                key={name}
                className={`char-figure-card ${selectedHero === name ? 'char-figure-card-selected' : ''}`}
                style={{ animationDelay: `${index * 0.03}s` }}
                onClick={() => handleHeroClick(name)}
              >
                <div className="char-figure-avatar">
                  <span className="char-figure-emoji">{name[0]}</span>
                  <span className="char-figure-rank-badge">M</span>
                </div>
                <div className="char-figure-info">
                  <h3 className="char-figure-name">{name}</h3>
                  <p className="char-figure-role">Main</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ 
          marginTop: '32px', 
          padding: '24px', 
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(0, 212, 255, 0.05))',
          border: '1px solid rgba(255, 215, 0, 0.2)'
        }}>
          <h3 style={{ 
            fontFamily: "'Cinzel', serif", 
            color: '#ffd666', 
            marginBottom: '12px',
            textShadow: '0 0 20px rgba(255, 215, 0, 0.3)'
          }}>
            Why Choose MLBB TradeGuard?
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛡️</div>
              <h4 style={{ color: '#ffd666', marginBottom: '4px', fontSize: '14px' }}>Secure Trading</h4>
              <p style={{ color: '#8a9bb8', fontSize: '12px' }}>Protected by verified middlemen</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚡</div>
              <h4 style={{ color: '#ffd666', marginBottom: '4px', fontSize: '14px' }}>Fast Transactions</h4>
              <p style={{ color: '#8a9bb8', fontSize: '12px' }}>Quick and efficient trades</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⭐</div>
              <h4 style={{ color: '#ffd666', marginBottom: '4px', fontSize: '14px' }}>Premium Service</h4>
              <p style={{ color: '#8a9bb8', fontSize: '12px' }}>Exclusive benefits for premium users</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
