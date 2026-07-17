import React from 'react';
import '../styles/Marketplace.css';

const HERO_ROLES = ['Fighter', 'Mage', 'Assassin', 'Marksman', 'Tank', 'Support'];
const HERO_NAMES = ['Alucard', 'Lancelot', 'Gusion', 'Layla', 'Tigreal', 'Estes'];
const HERO_COLORS = {
  Fighter: '#ff6b6b',
  Mage: '#a78bfa',
  Assassin: '#f59e0b',
  Marksman: '#34d399',
  Tank: '#60a5fa',
  Support: '#f472b6'
};

export default function CharacterFigure({ role, name, price, seller, rank, onClick, className = '' }) {
  return (
    <div className={`char-figure-card ${className}`} onClick={onClick}>
      <div className="char-figure-avatar" style={{ borderColor: HERO_COLORS[role] || '#ffd666' }}>
        <span className="char-figure-emoji">{name?.[0] || '?'}</span>
        <span className="char-figure-rank-badge" style={{ background: HERO_COLORS[role] || '#ffd666' }}>
          {role?.[0] || '?'}
        </span>
      </div>
      <div className="char-figure-info">
        <h3 className="char-figure-name">{name || 'Unknown Hero'}</h3>
        <p className="char-figure-role" style={{ color: HERO_COLORS[role] || '#ffd666' }}>{role || 'Unknown'}</p>
        <p className="char-figure-price">{price || '---'}</p>
      </div>
      <div className="char-figure-seller">
        <span className="char-figure-seller-label">Seller</span>
        <span className="char-figure-seller-name">{seller || 'Unknown'}</span>
      </div>
    </div>
  );
}

export { HERO_ROLES, HERO_NAMES, HERO_COLORS };
