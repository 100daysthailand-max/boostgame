import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import { api } from '../services/api';
import { useToast } from './Toast';
import WebApp from '@twa-dev/sdk';

const pages = [
  { path: '/play', label: 'Play', icon: '⚡' },
  { path: '/boost', label: 'Boost', icon: '🚀' },
  { path: '/tasks', label: 'Tasks', icon: '📋' },
  { path: '/rank', label: 'Rank', icon: '🏆' },
  { path: '/wallet', label: 'Wallet', icon: '💰' },
];

export function MainLayout() {
  const location = useLocation();
  const { initAuth, loading, isAuthenticated } = useAppStore();
  const { showToast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    WebApp.ready();
    WebApp.expand();

    const initData = WebApp.initData;
    
    const doAuth = async () => {
      if (initData && !api.getToken()) {
        try {
          await api.authTelegram(initData);
          await initAuth();
        } catch {
          // Telegram auth failed - try stored token
          const storedToken = localStorage.getItem('auth_token');
          if (storedToken) {
            api.setToken(storedToken);
            await initAuth();
          } else {
            showToast('Open in Telegram for full access', 'info');
          }
        }
      } else {
        // No initData (direct browser) - try stored token
        const storedToken = localStorage.getItem('auth_token');
        if (storedToken) {
          api.setToken(storedToken);
          await initAuth();
        } else {
          showToast('Open in Telegram for full access', 'info');
        }
      }
    };

    doAuth().catch(() => {
      // Ensure we don't get stuck on loading
      showToast('Authentication error', 'error');
    });
  }, [initAuth, showToast]);

  // Don't block on loading forever - show app after 3s max
  const [showApp, setShowApp] = useState(false);
  useEffect(() => {
    if (mounted) {
      const timer = setTimeout(() => setShowApp(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [mounted]);

  if (!mounted || (loading && !showApp)) {
    return (
      <div className="app loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="main-layout">
        <Outlet />
        <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
          {pages.map((page) => (
            <NavLink
              key={page.path}
              to={page.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              aria-current={location.pathname === page.path ? 'page' : undefined}
            >
              <span className="nav-icon" aria-hidden="true">{page.icon}</span>
              <span className="nav-label">{page.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}