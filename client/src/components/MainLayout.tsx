import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import { api } from '../services/api';
import { useToast } from './Toast';

const pages = [
  { path: '/play', label: 'Play', icon: '⚡' },
  { path: '/boost', label: 'Boost', icon: '🚀' },
  { path: '/tasks', label: 'Tasks', icon: '📋' },
  { path: '/rank', label: 'Rank', icon: '🏆' },
  { path: '/wallet', label: 'Wallet', icon: '💰' },
];

export function MainLayout() {
  const location = useLocation();
  const { initAuth, loading } = useAppStore();
  const { showToast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    WebApp.ready();
    WebApp.expand();
    
    const initData = WebApp.initData;
    if (initData && !api.getToken()) {
      api.authTelegram(initData).then(() => {
        initAuth();
      }).catch((err) => {
        showToast('Authentication failed', 'error');
      });
    } else {
      initAuth();
    }
  }, [initAuth, showToast]);

  if (!mounted || loading) {
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
      <ToastContainer />
    </div>
  );
}

import { WebApp } from '@twa-dev/sdk';