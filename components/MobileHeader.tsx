'use client';

import React from 'react';

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header className="mobile-header mobile-only">
      <button 
        onClick={onMenuClick}
        className="btn-ghost"
        style={{ fontSize: '24px', padding: '10px' }}
      >
        ☰
      </button>
      <div className="nav-logo-title" style={{ marginRight: 'auto', marginLeft: '10px' }}>
        ◈ PORT_TRACK
      </div>
    </header>
  );
}
