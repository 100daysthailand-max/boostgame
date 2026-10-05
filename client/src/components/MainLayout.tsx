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
  const { initAuth, loading, setLoading } = useAppStore();
  const { showToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [showApp, setShowApp] = useState(false);

  // Force show app after 3 seconds regardless of loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('Forcing app show after timeout');
      setShowApp(true);
      setLoading(false); // Force clear loading
    }, 3000);
    return () => clearTimeout(timer);
  }, [setLoading]);

  useEffect(() => {
    setMounted(true);
    WebApp.ready();
    WebApp.expand();

    const initData = WebApp.initData;
    console.log('initData available:', !!initData);
    console.log('stored token:', !!localStorage.getItem('auth_token'));
    console.log('API base:', import.meta.env.VITE_API_URL);

    const doAuth = async () => {
      try {
        if (initData && !api.getToken()) {
          console.log('Authenticating with Telegram initData...');
          await api.authTelegram(initData);
          await initAuth();
          console.log('Telegram auth success');
        } else {
          const storedToken = localStorage.getItem('auth_token');
          if (storedToken) {
            console.log('Using stored token');
            api.setToken(storedToken);
            await initAuth();
            console.log('Stored token auth success');
          } else {
            console.log('No auth available - demo mode');
            showToast('Open in Telegram for full access', 'info');
          }
        }
      } catch (err) {
        console.error('Auth error:', err);
        showToast('Auth failed, using demo mode', 'warning');
        // Don't block - continue to app
      } finally {
        setLoading(false);
      }
    };

    doAuth();
  }, [initAuth, setLoading, showToast]);

  // Show loading only for first 3 seconds
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