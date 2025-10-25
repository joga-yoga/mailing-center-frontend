import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { EmailsSetupPage } from './pages/emails/Setup';
import { CampaignsListPage } from './pages/campaigns/CampaignsList';
import { CampaignStatusPage } from './pages/campaigns/CampaignStatus';
import { CampaignObjectDetailsPage } from './pages/campaigns/CampaignObjectDetails';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/campaigns" replace />} />
          <Route path="emails/setup" element={<EmailsSetupPage />} />
          <Route path="campaigns" element={<CampaignsListPage />} />
          <Route path="campaigns/:campaignId" element={<CampaignStatusPage />} />
          <Route path="campaigns/:campaignId/objects/:objectId" element={<CampaignObjectDetailsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
