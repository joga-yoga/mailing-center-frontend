import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { B2BImportModal } from './B2BImportModal';
import './AppLayout.css';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

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
              <button
                className="nav-link nav-button"
                onClick={() => setIsImportModalOpen(true)}
              >
                Import B2B
              </button>
            </div>
          </nav>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <B2BImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};
