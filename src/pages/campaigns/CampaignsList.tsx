import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';
import './CampaignsList.css';

interface CampaignListItem {
  campaign_id: string;
  name: string | null;
  status: "pending" | "in_progress" | "paused" | "completed" | "failed";
  started_at: string | null;
  finished_at: string | null;
  created_at: string | null;
  
  country: string | null;
  object_type: string | null;
  
  parsing: boolean;
  auto_answering: boolean;
  use_corporate: boolean;
  
  tov: string | null;
  style: string | null;
  language: string;
  
  total_queued: number;
  total_sent: number;
  total_failed: number;
  total_replied: number;
}

export const CampaignsListPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const fetchCampaigns = async () => {
    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.campaigns));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle different response formats
      let campaignsList: CampaignListItem[] = [];
      if (Array.isArray(data)) {
        campaignsList = data;
      } else if (data && typeof data === 'object' && Array.isArray(data.campaigns)) {
        campaignsList = data.campaigns;
      } else if (data && typeof data === 'object') {
        // If it's a single object, wrap it in an array
        campaignsList = [data];
      }
      
      setCampaigns(campaignsList);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const formatDateTime = (isoString: string | null): string => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string): React.ReactNode => {
    const statusClasses: Record<string, string> = {
      pending: 'badge-pending',
      in_progress: 'badge-in-progress',
      paused: 'badge-paused',
      completed: 'badge-completed',
      failed: 'badge-failed',
    };

    const statusLabels: Record<string, string> = {
      pending: 'Pending',
      in_progress: 'In Progress',
      paused: 'Paused',
      completed: 'Completed',
      failed: 'Failed',
    };

    return (
      <span className={`status-badge ${statusClasses[status] || ''}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="campaigns-list-page">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="campaigns-list-page">
        <div className="error-alert">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="campaigns-list-page">
      <div className="page-header">
        <h1>Campaigns</h1>
        <Link to="/emails/setup" className="button button-primary">
          Create New Campaign
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="empty-state">
          <p>No campaigns</p>
          <Link to="/emails/setup" className="button button-primary">
            Create First Campaign
          </Link>
        </div>
      ) : (
        <div className="campaigns-table-container">
          <table className="campaigns-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Started</th>
                <th>Finished</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.campaign_id}>
                  <td className="campaign-name">
                    {campaign.name || 'Untitled'}
                    <div className="campaign-id">{campaign.campaign_id}</div>
                  </td>
                  <td>{getStatusBadge(campaign.status)}</td>
                  <td>{formatDateTime(campaign.started_at)}</td>
                  <td>{formatDateTime(campaign.finished_at)}</td>
                  <td>
                    <Link
                      to={`/campaigns/${campaign.campaign_id}`}
                      className="show-more-btn"
                    >
                      Show more
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

