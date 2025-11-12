import React, { useEffect, useState } from 'react';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';
import './SenderAccounts.css';

type SenderAccount = {
  id: string;
  email: string;
  password?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  imap_host?: string | null;
  imap_port: number;
  imap_ssl: boolean;
  smtp_host?: string | null;
  smtp_port?: number | null;
  selenium_required: boolean;
  server_id: string;
  mail_api_url_id?: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type MailApiUrl = {
  id: string;
  name: string;
  url: string;
  endpoint: string;
  is_active: boolean;
};

type SenderFormState = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  imap_host: string;
  imap_port: number;
  imap_ssl: boolean;
  smtp_host: string;
  smtp_port: number | '';
  selenium_required: boolean;
  server_id: string;
  is_active: boolean;
};

const INITIAL_FORM_STATE: SenderFormState = {
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  imap_host: '',
  imap_port: 993,
  imap_ssl: true,
  smtp_host: '',
  smtp_port: '',
  selenium_required: false,
  server_id: '1',
  is_active: true,
};

const formatDateTime = (isoString?: string | null) => {
  if (!isoString) {
    return '—';
  }
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
};

export const SenderAccountsPage: React.FC = () => {
  const [senders, setSenders] = useState<SenderAccount[]>([]);
  const [mailApiUrls, setMailApiUrls] = useState<MailApiUrl[]>([]);
  const [formData, setFormData] = useState<SenderFormState>(INITIAL_FORM_STATE);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [senderToDelete, setSenderToDelete] = useState<SenderAccount | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sendersRes, urlsRes] = await Promise.all([
        fetch(buildApiUrl(`${API_ENDPOINTS.senderAccounts}?active_only=false`)),
        fetch(buildApiUrl(`${API_ENDPOINTS.mailApiUrls}?active_only=false`)),
      ]);

      if (!sendersRes.ok) {
        const err = await sendersRes.json().catch(() => ({}));
        throw new Error(err.detail || err.message || `Failed to load senders (${sendersRes.status})`);
      }
      if (!urlsRes.ok) {
        const err = await urlsRes.json().catch(() => ({}));
        throw new Error(err.detail || err.message || `Failed to load mail API URLs (${urlsRes.status})`);
      }

      const sendersData: SenderAccount[] = await sendersRes.json();
      const normalizedSenders = sendersData.map((sender) => ({
        ...sender,
        selenium_required: Boolean(sender.selenium_required),
      }));
      const urlsData: MailApiUrl[] = await urlsRes.json();

      setSenders(normalizedSenders);
      setMailApiUrls(urlsData);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sender accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData(INITIAL_FORM_STATE);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    if (type === 'checkbox') {
      const target = event.target as HTMLInputElement;
      setFormData((prev) => ({
        ...prev,
        [name]: target.checked,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'imap_port'
          ? Number(value) || 0
          : name === 'smtp_port'
            ? value === '' ? '' : Number(value) || 0
            : value,
    }));
  };

  const handleServerTypeChange = (serverId: string) => {
    setFormData((prev) => ({
      ...prev,
      server_id: serverId,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        email: formData.email.trim(),
        password: formData.password.trim() || null,
        first_name: formData.first_name.trim() || null,
        last_name: formData.last_name.trim() || null,
        imap_host: formData.imap_host.trim() || null,
        imap_port: formData.imap_port,
        imap_ssl: formData.imap_ssl,
        smtp_host: formData.smtp_host.trim() || null,
        smtp_port: formData.smtp_port === '' ? null : Number(formData.smtp_port),
        selenium_required: formData.selenium_required,
        server_id: formData.server_id.trim() || '1',
        is_active: formData.is_active,
      };

      const response = await fetch(buildApiUrl(API_ENDPOINTS.senderAccounts), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.detail || errorBody.message || `Failed to create sender (${response.status})`);
      }

      const created: SenderAccount = await response.json();
      created.selenium_required = Boolean(created.selenium_required);
      setSenders((prev) => [created, ...prev]);
      resetForm();
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sender');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!senderToDelete) {
      return;
    }
    setDeletingId(senderToDelete.id);
    try {
      const response = await fetch(buildApiUrl(`${API_ENDPOINTS.senderAccounts}/${senderToDelete.id}`), {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.detail || errorBody.message || `Failed to delete sender (${response.status})`);
      }

      setSenders((prev) => prev.filter((sender) => sender.id !== senderToDelete.id));
      setSenderToDelete(null);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete sender');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="sender-accounts-page">
      <div className="page-header">
        <h1>Sender Accounts</h1>
        <div className="header-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={fetchData}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="sender-layout">
        <div className="sender-form-card">
          <h2>Add Sender</h2>
          <form onSubmit={handleSubmit} className="sender-form">
            <div className="form-row">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="sender@example.com"
              />
            </div>

            <div className="form-row">
              <label htmlFor="password">Password / App Password</label>
              <input
                id="password"
                name="password"
                type="text"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Optional"
              />
            </div>

            <div className="form-grid">
              <div className="form-row">
                <label htmlFor="first_name">First Name</label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  placeholder="Optional"
                />
              </div>
              <div className="form-row">
                <label htmlFor="last_name">Last Name</label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-row">
                <label htmlFor="imap_host">IMAP Host</label>
                <input
                  id="imap_host"
                  name="imap_host"
                  type="text"
                  value={formData.imap_host}
                  onChange={handleInputChange}
                  placeholder="imap.example.com"
                />
              </div>
              <div className="form-row">
                <label htmlFor="imap_port">IMAP Port</label>
                <input
                  id="imap_port"
                  name="imap_port"
                  type="number"
                  value={formData.imap_port}
                  onChange={handleInputChange}
                  min={1}
                  max={65535}
                />
              </div>
            </div>

            <label className="form-row checkbox-row" htmlFor="imap_ssl">
              <input
                id="imap_ssl"
                name="imap_ssl"
                type="checkbox"
                checked={formData.imap_ssl}
                onChange={handleInputChange}
              />
              Use IMAP SSL
            </label>

            <div className="form-grid">
              <div className="form-row">
                <label htmlFor="smtp_host">SMTP Host</label>
                <input
                  id="smtp_host"
                  name="smtp_host"
                  type="text"
                  value={formData.smtp_host}
                  onChange={handleInputChange}
                  placeholder="smtp.example.com"
                />
              </div>
              <div className="form-row">
                <label htmlFor="smtp_port">SMTP Port</label>
                <input
                  id="smtp_port"
                  name="smtp_port"
                  type="number"
                  value={formData.smtp_port === '' ? '' : formData.smtp_port}
                  onChange={handleInputChange}
                  min={1}
                  max={65535}
                  placeholder="e.g., 465 or 587"
                />
              </div>
            </div>

            <label className="form-row checkbox-row" htmlFor="selenium_required">
              <input
                id="selenium_required"
                name="selenium_required"
                type="checkbox"
                checked={formData.selenium_required}
                onChange={handleInputChange}
              />
              Requires Selenium (browser automation)
            </label>

            <div className="form-row server-type-row">
              <span>Server Type</span>
              <div className="server-type-options">
                <label>
                  <input
                    type="radio"
                    name="server_type"
                    value="1"
                    checked={formData.server_id === '1'}
                    onChange={() => handleServerTypeChange('1')}
                  />
                  Personal
                </label>
                <label>
                  <input
                    type="radio"
                    name="server_type"
                    value="2"
                    checked={formData.server_id === '2'}
                    onChange={() => handleServerTypeChange('2')}
                  />
                  Corporate
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="button button-primary" disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Sender'}
              </button>
              <button type="button" className="button button-secondary" onClick={resetForm} disabled={submitting}>
                Reset
              </button>
            </div>
          </form>
        </div>

        <div className="sender-list-card">
          <h2>Existing Senders</h2>
          {loading ? (
            <div className="loading-spinner">Loading senders...</div>
          ) : senders.length === 0 ? (
            <div className="empty-state">
              <p>No sender accounts found.</p>
            </div>
          ) : (
            <div className="senders-table-container">
              <table className="senders-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Server</th>
                    <th>Mail API URL</th>
                    <th>IMAP</th>
                    <th>SMTP</th>
                    <th>Automation</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {senders.map((sender) => (
                    <tr key={sender.id}>
                      <td>
                        <span className="sender-email">{sender.email}</span>
                      </td>
                      <td>
                        {sender.first_name || sender.last_name ? (
                          <>
                            {sender.first_name || ''} {sender.last_name || ''}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <div>Server {sender.server_id}</div>
                      </td>
                      <td>{mailApiUrls.find((url) => url.id === sender.mail_api_url_id)?.name || '—'}</td>
                      <td>
                        <div>{sender.imap_host || '—'}</div>
                        <div className="sender-meta">
                          Port {sender.imap_port} {sender.imap_ssl ? '(SSL)' : '(No SSL)'}
                        </div>
                      </td>
                      <td>
                        <div>{sender.smtp_host || '—'}</div>
                        <div className="sender-meta">
                          {sender.smtp_port ? `Port ${sender.smtp_port}` : ''}
                        </div>
                      </td>
                      <td>
                        <span className="automation-label">
                          {sender.selenium_required ? 'Selenium (browser)' : 'SMTP'}
                        </span>
                      </td>
                      <td>{formatDateTime(sender.created_at)}</td>
                      <td>
                        <button
                          type="button"
                          className="delete-btn"
                          onClick={() => setSenderToDelete(sender)}
                          disabled={deletingId === sender.id}
                        >
                          {deletingId === sender.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {senderToDelete && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Delete sender</h2>
            <p>
              Are you sure you want to delete sender <strong>{senderToDelete.email}</strong>? This action cannot be
              undone.
            </p>
            <div className="modal-buttons">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setSenderToDelete(null)}
                disabled={Boolean(deletingId)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="delete-btn"
                onClick={handleDelete}
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



