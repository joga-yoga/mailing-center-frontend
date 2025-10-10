import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CampaignStatusResponse } from '../../types/api';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';
import './CampaignStatus.css';

export const CampaignStatusPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [campaign, setCampaign] = useState<CampaignStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [expandedObjects, setExpandedObjects] = useState<Set<string>>(new Set());

  const fetchCampaignStatus = async () => {
    if (!campaignId) {
      setError('Campaign ID is required');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.campaignStatus(campaignId)));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const data: CampaignStatusResponse = await response.json();
      setCampaign(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignStatus();
  }, [campaignId]);

  useEffect(() => {
    if (!autoRefresh || !campaign || campaign.status === 'completed' || campaign.status === 'failed') {
      return;
    }

    const interval = setInterval(() => {
      fetchCampaignStatus();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, campaign?.status]);

  const formatDateTime = (isoString: string | null): string => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusBadge = (status: string): React.ReactNode => {
    const statusClasses: Record<string, string> = {
      pending: 'badge-pending',
      in_progress: 'badge-in-progress',
      completed: 'badge-completed',
      failed: 'badge-failed',
    };

    const statusLabels: Record<string, string> = {
      pending: 'Pending',
      in_progress: 'In Progress',
      completed: 'Completed',
      failed: 'Failed',
    };

    return (
      <span className={`status-badge ${statusClasses[status] || ''}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  const getEmailStatusBadge = (status: string): React.ReactNode => {
    const statusClasses: Record<string, string> = {
      pending: 'email-badge-pending',
      sending: 'email-badge-sending',
      sent: 'email-badge-sent',
      failed: 'email-badge-failed',
      replied: 'email-badge-replied',
      bounced: 'email-badge-bounced',
    };

    const statusLabels: Record<string, string> = {
      pending: 'Pending',
      sending: 'Sending',
      sent: 'Sent',
      failed: 'Failed',
      replied: 'Replied',
      bounced: 'Bounced',
    };

    return (
      <span className={`email-status-badge ${statusClasses[status] || ''}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="campaign-status-page">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="campaign-status-page">
        <div className="error-alert">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="campaign-status-page">
        <div className="error-alert">
          <strong>Campaign not found</strong>
        </div>
      </div>
    );
  }

  const isCampaignActive = campaign.status === 'pending' || campaign.status === 'in_progress';

  const toggleObjectExpand = (placeId: string) => {
    setExpandedObjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(placeId)) {
        newSet.delete(placeId);
      } else {
        newSet.add(placeId);
      }
      return newSet;
    });
  };

  return (
    <div className="campaign-status-page">
      <div className="campaign-header">
        <div>
          <h1>{campaign.name || 'Untitled'}</h1>
          <p className="campaign-id">ID: {campaign.campaign_id}</p>
        </div>
        {isCampaignActive && (
          <div className="header-actions">
            <label className="auto-refresh-toggle">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh
            </label>
            <button className="button button-secondary" onClick={fetchCampaignStatus}>
              Refresh
            </button>
          </div>
        )}
      </div>

      {/* Basic Status */}
      <div className="info-section">
        <h2>Campaign Status</h2>
        <div className="status-layout">
          <div className="info-item">
            <label>Started:</label>
            <div>{formatDateTime(campaign.started_at)}</div>
          </div>
          <div className="info-item">
            <label>Finished:</label>
            <div>{formatDateTime(campaign.finished_at)}</div>
          </div>
          <div className="info-item">
            <label>Status:</label>
            <div>{getStatusBadge(campaign.status)}</div>
          </div>
        </div>
      </div>

      {/* Objects List */}
      <div className="info-section objects-section">
        <h2>Objects ({campaign.objects.length})</h2>
        <div className="objects-table-container">
          <table className="objects-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Place ID</th>
                <th>Email</th>
                <th>Status</th>
                <th>Sent from</th>
                <th>Sent at</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaign.objects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="no-data">
                    No objects
                  </td>
                </tr>
              ) : (
                campaign.objects.map((obj) => (
                  <tr key={obj.place_id}>
                    <td>{obj.name || 'N/A'}</td>
                    <td className="monospace">{obj.place_id}</td>
                    <td className="monospace">{obj.email || 'N/A'}</td>
                    <td>{getEmailStatusBadge(obj.email_status)}</td>
                    <td className="monospace">{obj.from_email || 'N/A'}</td>
                    <td>{formatDateTime(obj.sent_at)}</td>
                    <td>
                      <button className="button-small show-more-btn">
                        Show more
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics */}
      <div className="stats-section">
        <h2>Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className={`stat-value ${campaign.statistics.total === 0 ? 'stat-zero' : ''}`}>{campaign.statistics.total}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-card stat-sent">
            <div className={`stat-value ${campaign.statistics.sent === 0 ? 'stat-zero' : ''}`}>{campaign.statistics.sent}</div>
            <div className="stat-label">Sent</div>
          </div>
          <div className="stat-card stat-failed">
            <div className={`stat-value ${campaign.statistics.failed === 0 ? 'stat-zero' : ''}`}>{campaign.statistics.failed}</div>
            <div className="stat-label">Failed</div>
          </div>
          <div className="stat-card stat-replied">
            <div className={`stat-value ${campaign.statistics.replied === 0 ? 'stat-zero' : ''}`}>{campaign.statistics.replied}</div>
            <div className="stat-label">Replied</div>
          </div>
        </div>
        {campaign.statistics.total > 0 && (
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${(campaign.statistics.sent / campaign.statistics.total) * 100}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Collapsible Details Section */}
      <div className="info-section details-section">
        <div className="details-header" onClick={() => setShowDetails(!showDetails)}>
          <h2>Settings Details</h2>
          <span className={`toggle-icon ${showDetails ? 'open' : ''}`}>▼</span>
        </div>
        
        {showDetails && (
          <div className="details-content">
            {/* Filters & Settings */}
            <div className="details-subsection">
              <h3>Filters and Settings</h3>
              <div className="settings-grid">
                {campaign.country && (
                  <div className="info-item">
                    <label>Country:</label>
                    <div>{campaign.country}</div>
                  </div>
                )}
                {campaign.object_type && (
                  <div className="info-item">
                    <label>Object Type:</label>
                    <div>{campaign.object_type}</div>
                  </div>
                )}
                <div className="info-item full-width">
                  <label>Parsing:</label>
                  <div>{campaign.parsing ? '✅ Enabled' : '❌ Disabled'}</div>
                </div>
                <div className="info-item full-width">
                  <label>Auto-answering:</label>
                  <div>{campaign.auto_answering ? '✅ Enabled' : '❌ Disabled'}</div>
                </div>
                <div className="info-item full-width">
                  <label>Corporate Domain:</label>
                  <div>{campaign.use_corporate ? '✅ Enabled' : '❌ Disabled'}</div>
                </div>
                {campaign.daily_limit !== null && campaign.daily_limit !== undefined && (
                  <div className="info-item">
                    <label>Daily Limit:</label>
                    <div>{campaign.daily_limit}</div>
                  </div>
                )}
                {campaign.timezone && (
                  <div className="info-item">
                    <label>Timezone:</label>
                    <div>{campaign.timezone}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Communication Style */}
            <div className="details-subsection">
              <h3>Communication Style</h3>
              <div className="info-grid">
                {campaign.tov && (
                  <div className="info-item">
                    <label>Tone of Voice:</label>
                    <div>{campaign.tov}</div>
                  </div>
                )}
                {campaign.style && (
                  <div className="info-item">
                    <label>Writing Style:</label>
                    <div>{campaign.style}</div>
                  </div>
                )}
                <div className="info-item">
                  <label>Language:</label>
                  <div>{campaign.language}</div>
                </div>
              </div>
            </div>

            {/* Prompts */}
            <div className="details-subsection">
              <h3>Prompts</h3>
              <div className="prompts-grid">
                {campaign.subject_prompt && (
                  <div className="prompt-item">
                    <label>Subject:</label>
                    <div className="prompt-text">{campaign.subject_prompt}</div>
                  </div>
                )}
                {campaign.body_prompt && (
                  <div className="prompt-item">
                    <label>Body:</label>
                    <div className="prompt-text">{campaign.body_prompt}</div>
                  </div>
                )}
                {campaign.parsing_prompt && (
                  <div className="prompt-item">
                    <label>Parsing:</label>
                    <div className="prompt-text">{campaign.parsing_prompt}</div>
                  </div>
                )}
                {campaign.reply_prompt && (
                  <div className="prompt-item">
                    <label>Replies:</label>
                    <div className="prompt-text">{campaign.reply_prompt}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

