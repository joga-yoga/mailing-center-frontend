import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CampaignStatusResponse } from '../../types/api';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';
import './CampaignStatus.css';

export const CampaignStatusPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<CampaignStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [countdownMs, setCountdownMs] = useState<number | null>(null);
  const [etaMs, setEtaMs] = useState<number | null>(null);
  const [mutating, setMutating] = useState<boolean>(false);

  const fetchCampaignStatus = useCallback(async () => {
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
  }, [campaignId]);

  useEffect(() => {
    fetchCampaignStatus();
  }, [fetchCampaignStatus]);

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const interval = setInterval(() => {
      fetchCampaignStatus();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, fetchCampaignStatus]);

  // Initialize or update local countdown when response changes
  useEffect(() => {
    if (campaign && campaign.next_send_in_seconds !== null && campaign.next_send_in_seconds !== undefined) {
      const ms = Math.max(0, Math.round(campaign.next_send_in_seconds * 1000));
      setCountdownMs(ms);
    } else {
      setCountdownMs(null);
    }
  }, [campaign]);

  // Tick the countdown locally every second, independent from polling
  useEffect(() => {
    if (countdownMs === null) return;
    if (countdownMs <= 0) return;
    const tick = setInterval(() => {
      setCountdownMs((prev) => {
        if (prev === null) return prev;
        const next = prev - 1000;
        return next > 0 ? next : 0;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [countdownMs]);

  // Initialize or update time to last send countdown
  useEffect(() => {
    if (campaign && campaign.estimated_seconds_to_finish !== null && campaign.estimated_seconds_to_finish !== undefined) {
      const ms = Math.max(0, Math.round(campaign.estimated_seconds_to_finish * 1000));
      setEtaMs(ms);
    } else {
      setEtaMs(null);
    }
  }, [campaign]);

  useEffect(() => {
    if (etaMs === null) return;
    if (etaMs <= 0) return;
    const tick = setInterval(() => {
      setEtaMs((prev) => {
        if (prev === null) return prev;
        const next = prev - 1000;
        return next > 0 ? next : 0;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [etaMs]);

  const formatHms = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000); // round up to show user-facing seconds
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const hh = hours.toString().padStart(2, '0');
    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
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
      second: '2-digit',
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

  const getEmailStatusBadge = (status: string | null): React.ReactNode => {
    const statusClasses: Record<string, string> = {
      queued: 'email-badge-queued',
      enriching: 'email-badge-enriching',
      generated: 'email-badge-generated',
      scheduled: 'email-badge-scheduled',
      sending: 'email-badge-sending',
      sent: 'email-badge-sent',
      failed: 'email-badge-failed',
      replied: 'email-badge-replied',
      bounced: 'email-badge-bounced',
    };

    const statusLabels: Record<string, string> = {
      queued: 'Queued',
      enriching: 'Enriching',
      generated: 'Generated',
      scheduled: 'Scheduled',
      sending: 'Sending',
      sent: 'Sent',
      failed: 'Failed',
      replied: 'Replied',
      bounced: 'Bounced',
    };

    const cls = status ? statusClasses[status] || '' : '';
    const label = status ? (statusLabels[status] || status) : 'N/A';

    return (
      <span className={`email-status-badge ${cls}`}>
        {label}
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

  const canPause = campaign.status === 'in_progress';
  const canResume = campaign.status === 'paused';

  const handlePause = async () => {
    if (!campaignId) return;
    try {
      setMutating(true);
      const response = await fetch(buildApiUrl(API_ENDPOINTS.campaignPause(campaignId)), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }
      await fetchCampaignStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setMutating(false);
    }
  };

  const handleResume = async () => {
    if (!campaignId) return;
    try {
      setMutating(true);
      const response = await fetch(buildApiUrl(API_ENDPOINTS.campaignResume(campaignId)), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }
      await fetchCampaignStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setMutating(false);
    }
  };

  return (
    <div className="campaign-status-page">
      <div className="campaign-header">
        <div>
          <h1>{campaign.name || 'Untitled'}</h1>
          <p className="campaign-id">ID: {campaign.campaign_id}</p>
        </div>
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
      </div>

      {/* Basic Status */}
      <div className="info-section">
        <h2>Campaign Status</h2>
        <div className={`status-layout columns-3`}>
          <div className="status-col">
            <div className="info-item">
              <label>Started:</label>
              <div>{formatDateTime(campaign.started_at)}</div>
            </div>
            <div className="info-item">
              <label>Finished:</label>
              <div>{formatDateTime(campaign.finished_at)}</div>
            </div>
          </div>
          <div className="status-col">
            <div className="info-item">
              <label>Status:</label>
              <div>{getStatusBadge(campaign.status)}</div>
            </div>
            {(canPause || canResume) && (
              <div className="info-item">
                <label>Controls:</label>
                <div>
                  {canPause && (
                    <button className="button button-outline-primary" onClick={handlePause} disabled={mutating}>
                      {mutating ? 'Pausing...' : 'Pause Campaign'}
                    </button>
                  )}
                  {canResume && (
                    <button className="button button-outline-primary" onClick={handleResume} disabled={mutating}>
                      {mutating ? 'Resuming...' : 'Resume Campaign'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="status-col">
            {campaign.status !== 'paused' && countdownMs !== null && countdownMs > 0 && (
              <div className="info-item">
                <label>Next Send In:</label>
                <div>{formatHms(Math.max(0, countdownMs))}</div>
              </div>
            )}
            {campaign.status !== 'paused' && etaMs !== null && (
              <div className="info-item">
                <label>ETA to finish:</label>
                <div>{formatHms(Math.max(0, etaMs))}</div>
              </div>
            )}
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
                <th>Email</th>
                <th>Status</th>
                <th>Planned</th>
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
                [...campaign.objects]
                  .sort((a, b) => {
                    const aTime = a.planned_send_at ? Date.parse(a.planned_send_at) : null;
                    const bTime = b.planned_send_at ? Date.parse(b.planned_send_at) : null;
                    if (aTime === null && bTime === null) return 0;
                    if (aTime === null) return 1; // nulls last
                    if (bTime === null) return -1;
                    return bTime - aTime; // descending: latest first
                  })
                  .map((obj) => (
                  <tr key={obj.place_id}>
                    <td title={obj.place_id || ''}>{obj.name || 'N/A'}</td>
                    <td className="monospace">{obj.email || 'N/A'}</td>
                    <td>{getEmailStatusBadge(obj.email_status)}</td>
                    <td>{formatDateTime(obj.planned_send_at)}</td>
                    <td className="monospace">{obj.from_email || 'N/A'}</td>
                    <td>{formatDateTime(obj.sent_at)}</td>
                    <td>
                      <button 
                        className="button-small show-more-btn"
                        onClick={() => navigate(`/campaigns/${campaignId}/objects/${obj.place_id}`)}
                      >
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
          <div className="stat-card stat-bounced">
            <div className={`stat-value ${campaign.statistics.bounced === 0 ? 'stat-zero' : ''}`}>{campaign.statistics.bounced}</div>
            <div className="stat-label">Bounced</div>
          </div>
        </div>
        {campaign.statistics.total > 0 && (
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${((campaign.statistics.sent + campaign.statistics.failed + campaign.statistics.replied + campaign.statistics.bounced) / campaign.statistics.total) * 100}%`,
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

