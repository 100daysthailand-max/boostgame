import { Outlet, NavLink, useLocation } from 'react-router-dom';

const pages = [
  { path: '/play', label: 'Play', icon: '⚡' },
  { path: '/boost', label: 'Boost', icon: '🚀' },
  { path: '/tasks', label: 'Tasks', icon: '📋' },
  { path: '/rank', label: 'Rank', icon: '🏆' },
  { path: '/wallet', label: 'Wallet', icon: '💰' },
];

export function MainLayout() {
  const location = useLocation();

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
