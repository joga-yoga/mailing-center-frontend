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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState<CampaignListItem | null>(null);

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

  const handleDelete = async (campaignId: string) => {
    setDeletingId(campaignId);
    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.campaignStatus(campaignId)), {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `Server error: ${response.status}`);
      }

      setCampaigns((prev) => prev.filter((campaign) => campaign.campaign_id !== campaignId));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setDeletingId(null);
      setCampaignToDelete(null);
    }
  };

  const openDeleteModal = (campaign: CampaignListItem) => {
    setCampaignToDelete(campaign);
  };

  const closeDeleteModal = () => {
    if (deletingId) {
      return;
    }
    setCampaignToDelete(null);
  };

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
                    <div className="actions-cell">
                      <Link
                        to={`/campaigns/${campaign.campaign_id}`}
                        className="show-more-btn"
                      >
                        Show more
                      </Link>
                      {campaign.status === 'completed' && (
                        <button
                          type="button"
                          className="delete-btn"
                          onClick={() => openDeleteModal(campaign)}
                          disabled={deletingId === campaign.campaign_id}
                        >
                          {deletingId === campaign.campaign_id ? 'Deleting...' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {campaignToDelete && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Delete campaign</h2>
            <p>
              Are you sure you want to delete{' '}
              <strong>{campaignToDelete.name || 'Untitled campaign'}</strong>? This action cannot be undone.
            </p>
            <div className="modal-buttons">
              <button
                type="button"
                className="button button-secondary"
                onClick={closeDeleteModal}
                disabled={Boolean(deletingId)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="delete-btn"
                onClick={() => handleDelete(campaignToDelete.campaign_id)}
                disabled={Boolean(deletingId)}
              >
                {deletingId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

