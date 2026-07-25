'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/lib/auth';
import { logoutAction } from '@/lib/actions/auth';
import { useRouter } from 'next/navigation';

const navItems = [
// ... (rest of the preamble)
  { href: '/', label: 'Dashboard', icon: '◈' },
  { href: '/stocks/new', label: 'Add Stock', icon: '+' },
  { href: '/history', label: 'Trading History', icon: '▤' },
  { href: '/files', label: 'จัดการไฟล์ (Files)', icon: '📂' },
  { href: '/info', label: 'คลังความรู้ (Inf.)', icon: 'ℹ' },
  { href: '/backup', label: 'Backup / Restore', icon: '⊡' },
];

import { useState, useEffect } from 'react';
import { MobileHeader } from './MobileHeader';

export function SidebarManager() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  if (pathname === '/login') return null;

  return (
    <>
      <MobileHeader onMenuClick={() => setIsOpen(true)} />
      <Sidebar isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div className="mobile-overlay" onClick={onClose} />
      )}
      
      <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="nav-header desktop-only">
          <div className="nav-logo">
            <div className="nav-logo-title">◈ PORT_TRACK</div>
            <div className="nav-logo-sub">Stock Portfolio Manager</div>
          </div>
        </div>

        <div className="mobile-only" style={{ padding: '20px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
          <div className="nav-logo-title">◈ PORT_TRACK</div>
          <button onClick={onClose} className="btn-ghost" style={{ fontSize: '20px' }}>✕</button>
        </div>

        <div className="nav-section">
          <div className="nav-section-label">Menu</div>
          {navItems.map((item) => {
            const isActive = item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (typeof window !== 'undefined' && window.innerWidth <= 768 && onClose) {
                    onClose();
                  }
                }}
              >
                <span className="mono" style={{ fontSize: '12px', width: '14px', textAlign: 'center' }}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="nav-section" style={{ marginTop: 'auto' }}>
          <div className="nav-section-label">System</div>
          <Link 
            href="/settings" 
            className={`nav-item ${pathname === '/settings' ? 'active' : ''}`}
            onClick={() => {
              if (typeof window !== 'undefined' && window.innerWidth <= 768 && onClose) {
                onClose();
              }
            }}
          >
            <span className="mono" style={{ fontSize: '12px', width: '14px', textAlign: 'center' }}>⚙</span>
            Change User/Pass
          </Link>
          <Link 
            href="/settings/logs" 
            className={`nav-item ${pathname === '/settings/logs' ? 'active' : ''}`}
            onClick={() => {
              if (typeof window !== 'undefined' && window.innerWidth <= 768 && onClose) {
                onClose();
              }
            }}
          >
            <span className="mono" style={{ fontSize: '12px', width: '14px', textAlign: 'center' }}>▤</span>
            Access Logs
          </Link>
          <button 
            onClick={() => {
              if (confirm('ต้องการออกจากระบบใช่หรือไม่?')) {
                logout();
                if (typeof window !== 'undefined' && window.innerWidth <= 768 && onClose) {
                  onClose();
                }
              }
            }}
            className="nav-item"
            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)' }}
          >
            <span className="mono" style={{ fontSize: '12px', width: '14px', textAlign: 'center' }}>⎋</span>
            Logout
          </button>
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.8 }}>
            <div>PORT_TRACK v1.1</div>
            <div>Powered by Supabase</div>
          </div>
        </div>
      </nav>
    </>
  );
}
