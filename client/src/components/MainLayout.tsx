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

  // Force show app after 2 seconds - independent of any state
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('[MainLayout] Force show app after 2s timeout');
      setShowApp(true);
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [setLoading]);

  // Mount and auth
  useEffect(() => {
    console.log('[MainLayout] Mounting...');
    setMounted(true);
    WebApp.ready();
    WebApp.expand();

    const initData = WebApp.initData;
    console.log('[MainLayout] initData:', !!initData, initData?.substring(0, 50));
    console.log('[MainLayout] stored token:', !!localStorage.getItem('auth_token'));
    console.log('[MainLayout] API base:', import.meta.env.VITE_API_URL);

    const doAuth = async () => {
      try {
        if (initData && !api.getToken()) {
          console.log('[MainLayout] Authenticating with Telegram...');
          await api.authTelegram(initData);
          await initAuth();
          console.log('[MainLayout] Telegram auth success');
        } else {
          const storedToken = localStorage.getItem('auth_token');
          if (storedToken) {
            console.log('[MainLayout] Using stored token');
            api.setToken(storedToken);
            await initAuth();
            console.log('[MainLayout] Stored token auth success');
          } else {
            console.log('[MainLayout] No auth - demo mode');
            showToast('Open in Telegram for full access', 'info');
          }
        }
      } catch (err) {
        console.error('[MainLayout] Auth error:', err);
        showToast('Auth failed, demo mode', 'warning');
      } finally {
        setLoading(false);
      }
    };

    doAuth();
  }, [initAuth, setLoading, showToast]);

  // ALWAYS show app after mounted + 2s, regardless of loading state
  if (!mounted) {
    return (
      <div className="app loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // After mounted, show app immediately (timeout will handle loading)
  console.log('[MainLayout] Render: mounted=', mounted, 'loading=', loading, 'showApp=', showApp);

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