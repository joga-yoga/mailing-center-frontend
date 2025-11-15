import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';
import './CampaignObjectDetails.css';

interface ThreadMessage {
  id: string;
  type: 'sent' | 'received';
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  created_at: string;
  in_reply_to: string | null;
  message_id: string | null;
}

interface PendingReply {
  id: string;
  type: 'pending_reply';
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  scheduled_at: string;
  created_at: string;
}

interface EmailThread {
  thread_id: string;
  campaign_id: string;
  participants: string[];
  messages: ThreadMessage[];
  pending_replies?: PendingReply[];
}

interface CampaignObjectDetailsResponse {
  campaign: {
    id: string;
    name: string;
    status: string;
    country: string | null;
    object_type: string | null;
    parsing: boolean;
    auto_answering: boolean;
    use_corporate: boolean;
    tov: string | null;
    style: string | null;
    language: string;
    created_at: string | null;
  };
  target: {
    id: string;
    place_id: string | null;
    name: string | null;
    type: string | null;
    to_email: string;
    status: string;
    attempts: number;
    last_error: string | null;
    generation_error: string | null;
    planned_send_at: string | null;
    sent_at: string | null;
    email_subject: string | null;
    email_body: string | null;
    email_language: string | null;
    thread_id: string | null;
  };
  sent_email: {
    id: string;
    from_email: string;
    to_email: string;
    subject: string | null;
    body: string | null;
    status: string | null;
    message_id: string | null;
    error: string | null;
    sender_name: string | null;
    server_id: string | null;
    provider: string | null;
    sent_at: string | null;
    thread_id: string | null;
    created_at: string | null;
  } | null;
  b2b_object: {
    place_id: string;
    name: string;
    type: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    description: string | null;
  } | null;
}

export const CampaignObjectDetailsPage: React.FC = () => {
  const { campaignId, objectId } = useParams<{ campaignId: string; objectId: string }>();
  const [data, setData] = useState<CampaignObjectDetailsResponse | null>(null);
  const [thread, setThread] = useState<EmailThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();
  const hasFetched = useRef(false);
  
  // Reply form state
  const [replySubject, setReplySubject] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  useEffect(() => {
    const fetchDetails = async () => {
      if (!campaignId || !objectId) {
        setError('Missing campaign ID or object ID');
        setLoading(false);
        return;
      }
      
      if (hasFetched.current) {
        return;
      }
      hasFetched.current = true;

      setLoading(true);
      setError('');
      try {
        // Завантажити деталі об'єкта
        const url = buildApiUrl(API_ENDPOINTS.campaignObjectDetails(campaignId, objectId));
        const response = await fetch(url);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
        const result: CampaignObjectDetailsResponse = await response.json();
        setData(result);
        
        // Якщо є thread_id, завантажити thread
        const threadId = result.sent_email?.thread_id || result.target?.thread_id;
        console.log('DEBUG: Thread ID from result:', threadId);
        console.log('DEBUG: sent_email thread_id:', result.sent_email?.thread_id);
        console.log('DEBUG: target thread_id:', result.target?.thread_id);
        
        if (threadId) {
          try {
            const threadUrl = buildApiUrl(API_ENDPOINTS.emailThread(campaignId, threadId));
            console.log('DEBUG: Fetching thread from URL:', threadUrl);
            const threadResponse = await fetch(threadUrl);
            console.log('DEBUG: Thread response status:', threadResponse.status);
            if (threadResponse.ok) {
              const threadData: EmailThread = await threadResponse.json();
              console.log('DEBUG: Thread data received:', threadData);
              setThread(threadData);
            } else {
              const errorText = await threadResponse.text();
              console.error('DEBUG: Thread fetch failed:', errorText);
            }
          } catch (threadErr) {
            console.warn('Failed to load thread:', threadErr);
          }
        } else {
          console.log('DEBUG: No thread_id found');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [campaignId, objectId]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!campaignId || !objectId) {
      setSendError('Missing campaign ID or object ID');
      return;
    }
    
    if (!replySubject.trim() || !replyBody.trim()) {
      setSendError('Subject and body are required');
      return;
    }
    
    setSending(true);
    setSendError('');
    
    try {
      const url = buildApiUrl(API_ENDPOINTS.sendReply(campaignId, objectId));
      
      // Create abort controller with 5 minute timeout for long email sending operations
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 minutes
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: replySubject,
          body: replyBody,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      // Clear form
      setReplySubject('');
      setReplyBody('');
      
      // Reload thread to show new message
      if (data?.sent_email?.thread_id || data?.target?.thread_id) {
        const threadId = data.sent_email?.thread_id || data.target?.thread_id;
        if (threadId) {
          const threadUrl = buildApiUrl(API_ENDPOINTS.emailThread(campaignId, threadId));
          const threadResponse = await fetch(threadUrl);
          if (threadResponse.ok) {
            const threadData: EmailThread = await threadResponse.json();
            setThread(threadData);
          }
        }
      }
      
      alert('Reply sent successfully!');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setSendError('Request timed out. The email may still be sending in the background. Please check the thread later.');
      } else {
        setSendError(err.message);
      }
    } finally {
      setSending(false);
    }
  };

  const formatDateTime = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses: { [key: string]: string } = {
      pending: 'status-badge status-badge-generating',
      generating: 'status-badge status-badge-generating',
      scheduled: 'status-badge status-badge-scheduled',
      sending: 'status-badge status-badge-sending',
      sent: 'status-badge status-badge-sent',
      failed: 'status-badge status-badge-failed',
      replied: 'status-badge status-badge-replied',
      bounced: 'status-badge status-badge-bounced',
    };

    const statusLabels: { [key: string]: string } = {
      pending: 'Pending',
      generating: 'Generating',
      scheduled: 'Scheduled',
      sending: 'Sending',
      sent: 'Sent',
      failed: 'Failed',
      replied: 'Replied',
      bounced: 'Bounced',
    };

    return (
      <span className={`status-badge ${statusClasses[status] || ''}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="campaign-object-details-page">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="campaign-object-details-page">
        <div className="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate(-1)} className="btn btn-secondary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="campaign-object-details-page">
        <div className="error-message">
          <h2>Not Found</h2>
          <p>Campaign object not found.</p>
          <button onClick={() => navigate(-1)} className="btn btn-secondary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="campaign-object-details-page">
      {/* Header */}
      <div className="campaign-object-header">
        <div className="campaign-object-header-left">
          <button onClick={() => navigate(-1)} className="btn btn-secondary campaign-object-back-btn">
            ← Back
          </button>
          <div className="campaign-object-title">
            <h1>{data.target.name || 'Unknown Object'}</h1>
            <div className="campaign-object-meta">
              <span className="campaign-object-email">{data.target.to_email}</span>
            </div>
          </div>
        </div>
        <div className="campaign-object-header-right">
          <div className="campaign-object-campaign-info">
            <span className="campaign-object-campaign-name">{data.campaign.name}</span>
          </div>
        </div>
      </div>

      {/* Main Content - Email Thread */}
      <div className="campaign-object-main-content">
        {/* Email Thread */}
        <div className="campaign-object-email-thread">
              <h2>Email Conversation</h2>
              
              {thread && thread.messages.length > 0 ? (
                <>
                  {/* Показати всі повідомлення з thread */}
                  {thread.messages.map((message, index) => (
                    <div 
                      key={message.id} 
                      className={`email-message ${message.type === 'sent' ? 'sent-email' : 'reply-email'}`}
                    >
                      <div className="email-message-header">
                        <div className="email-sender">
                          <strong>{message.from_email}</strong>
                          <span className="email-time">{formatDateTime(message.created_at)}</span>
                        </div>
                        <div className="email-message-header-right">
                          {message.type === 'sent' && data.sent_email?.id.startsWith('generated_') && data.target.status !== 'sent' && (
                            <div className="email-status-badge email-generated">
                              Generated (Not Sent)
                            </div>
                          )}
                          <span className="email-message-id">#{message.id.slice(-8)}</span>
                        </div>
                      </div>
                      <div className="email-message-content">
                        <div className="email-subject">
                          <strong>Subject:</strong> {message.subject}
                        </div>
                        <div className="email-body">
                          <pre>{message.body}</pre>
                        </div>
                      </div>
                      {message.type === 'sent' && data.sent_email?.error && (
                        <div className="email-error">
                          <strong>Error:</strong> {data.sent_email.error}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Показати pending replies */}
                  {thread.pending_replies && thread.pending_replies.length > 0 && thread.pending_replies.map((pending) => (
                    <div 
                      key={pending.id} 
                      className="email-message pending-reply"
                    >
                      <div className="email-message-header">
                        <div className="email-sender">
                          <strong>{pending.from_email}</strong>
                          <span className="email-time">
                            Will send at: {formatDateTime(pending.scheduled_at)}
                          </span>
                        </div>
                        <div className="email-message-header-right">
                          <div className="email-status-badge email-pending">
                            Auto-Reply Scheduled
                          </div>
                          <span className="email-message-id">#{pending.id.slice(-8)}</span>
                        </div>
                      </div>
                      <div className="email-message-content">
                        <div className="email-subject">
                          <strong>Subject:</strong> {pending.subject}
                        </div>
                        <div className="email-body">
                          <pre>{pending.body}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : data.sent_email ? (
                // Fallback: показати тільки відправлений лист якщо thread не завантажився
                <div className="email-message sent-email">
                  <div className="email-message-header">
                    <div className="email-sender">
                      <strong>{data.sent_email.from_email}</strong>
                      <span className="email-time">{formatDateTime(data.sent_email.sent_at)}</span>
                    </div>
                    <div className="email-message-header-right">
                      {data.sent_email.id.startsWith('generated_') && data.target.status !== 'sent' && (
                        <div className="email-status-badge email-generated">
                          Generated (Not Sent)
                        </div>
                      )}
                      <span className="email-message-id">#{data.sent_email.id.slice(-8)}</span>
                    </div>
                  </div>
                  <div className="email-message-content">
                    <div className="email-subject">
                      <strong>Subject:</strong> {data.sent_email.subject}
                    </div>
                    <div className="email-body">
                      <pre>{data.sent_email.body}</pre>
                    </div>
                  </div>
                  {data.sent_email.error && (
                    <div className="email-error">
                      <strong>Error:</strong> {data.sent_email.error}
                    </div>
                  )}
                </div>
              ) : (
                <div className="email-message no-email">
                  <div className="email-message-content">
                    <p>No email sent yet or failed to send.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Reply Form */}
            <div className="reply-form-section">
              <h2>Send Reply</h2>
              <form onSubmit={handleSendReply} className="reply-form">
                <div className="form-group">
                  <label htmlFor="replySubject">Subject:</label>
                  <input
                    type="text"
                    id="replySubject"
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                    placeholder="Enter subject"
                    disabled={sending}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="replyBody">Body:</label>
                  <textarea
                    id="replyBody"
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Enter your reply"
                    rows={10}
                    disabled={sending}
                  />
                </div>
                {sendError && <div className="error-message">{sendError}</div>}
                <button type="submit" disabled={sending} className="send-reply-button">
                  {sending ? 'Sending...' : 'Send Reply'}
                </button>
              </form>
            </div>

        {/* Overview Info */}
        <div className="campaign-object-overview">
          <div className="campaign-object-info-grid">
            <div className="campaign-object-info-card">
              <h3>Target Information</h3>
              <div className="campaign-object-info-item">
                <label>Email:</label>
                <span>{data.target.to_email}</span>
              </div>
              <div className="campaign-object-info-item">
                <label>Status:</label>
                {getStatusBadge(data.target.status)}
              </div>
              <div className="campaign-object-info-item">
                <label>Attempts:</label>
                <span>{data.target.attempts}</span>
              </div>
              <div className="campaign-object-info-item">
                <label>Planned Send:</label>
                <span>{formatDateTime(data.target.planned_send_at)}</span>
              </div>
              <div className="campaign-object-info-item">
                <label>Sent At:</label>
                <span>{formatDateTime(data.target.sent_at)}</span>
              </div>
            </div>

            <div className="campaign-object-info-card">
              <h3>Campaign Settings</h3>
              <div className="campaign-object-info-item">
                <label>Country:</label>
                <span>{data.campaign.country || 'N/A'}</span>
              </div>
              <div className="campaign-object-info-item">
                <label>Object Type:</label>
                <span>{data.campaign.object_type || 'N/A'}</span>
              </div>
              <div className="campaign-object-info-item">
                <label>Language:</label>
                <span>{data.campaign.language}</span>
              </div>
              <div className="campaign-object-info-item">
                <label>Style:</label>
                <span>{data.campaign.style || 'N/A'}</span>
              </div>
              <div className="campaign-object-info-item">
                <label>Tone:</label>
                <span>{data.campaign.tov || 'N/A'}</span>
              </div>
            </div>

            {data.target.last_error && (
              <div className="campaign-object-info-card error-card">
                <h3>Last Error</h3>
                <div className="error-content">
                  <pre>{data.target.last_error}</pre>
                </div>
              </div>
            )}

            {data.target.generation_error && (
              <div className="campaign-object-info-card error-card">
                <h3>Generation Error</h3>
                <div className="error-content">
                  <pre>{data.target.generation_error}</pre>
                </div>
              </div>
            )}
          </div>
        </div>

          {/* B2B Object Info */}
          {data.b2b_object && (
            <div className="b2b-info-section">
              <h3>B2B Object Information</h3>
              <div className="b2b-info-grid">
                <div className="b2b-info-item">
                  <label>Name:</label>
                  <span>{data.b2b_object.name}</span>
                </div>
                <div className="b2b-info-item">
                  <label>Type:</label>
                  <span>{data.b2b_object.type}</span>
                </div>
                <div className="b2b-info-item">
                  <label>Email:</label>
                  <span>{data.b2b_object.email}</span>
                </div>
                <div className="b2b-info-item">
                  <label>Phone:</label>
                  <span>{data.b2b_object.phone || 'N/A'}</span>
                </div>
                <div className="b2b-info-item">
                  <label>Website:</label>
                  <span>
                    {data.b2b_object.website ? (
                      <a href={data.b2b_object.website} target="_blank" rel="noopener noreferrer">
                        {data.b2b_object.website}
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </span>
                </div>
                <div className="b2b-info-item">
                  <label>Address:</label>
                  <span>{data.b2b_object.address || 'N/A'}</span>
                </div>
                <div className="b2b-info-item">
                  <label>City:</label>
                  <span>{data.b2b_object.city || 'N/A'}</span>
                </div>
                <div className="b2b-info-item">
                  <label>Country:</label>
                  <span>{data.b2b_object.country || 'N/A'}</span>
                </div>
              </div>
              {data.b2b_object.description && (
                <div className="b2b-description">
                  <h4>Description</h4>
                  <p>{data.b2b_object.description}</p>
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
};