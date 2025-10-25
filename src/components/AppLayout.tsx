import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import './AppLayout.css';

export const AppLayout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="container">
          <nav className="app-nav">
            <Link to="/" className="nav-brand">
              Email Campaign Center
            </Link>
            <div className="nav-links">
              <Link
                to="/emails/setup"
                className={`nav-link ${location.pathname === '/emails/setup' ? 'active' : ''}`}
              >
                Campaign Setup
              </Link>
              <Link
                to="/campaigns"
                className={`nav-link ${location.pathname.startsWith('/campaigns') ? 'active' : ''}`}
              >
                Campaigns
              </Link>
            </div>
          </nav>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
};
