import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { TextareaField } from '../../components/TextareaField';
import { ToggleField } from '../../components/ToggleField';
import { CountrySelect } from '../../components/CountrySelect';
import { ObjectTypeSelect } from '../../components/ObjectTypeSelect';
import { TovSelect } from '../../components/TovSelect';
import { WritingStyleSelect } from '../../components/WritingStyleSelect';
import { CampaignSetupRequest, CampaignSetupResponse } from '../../types/api';
import { API_ENDPOINTS } from '../../config/api';
import { apiClient } from '../../utils/apiClient';
import { useSenderAccounts } from '../../hooks/useSenderAccounts';
import { useRecipientCount } from '../../hooks/useRecipientCount';
import './Setup.css';

export const EmailsSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const emailsTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [recipientMode, setRecipientMode] = useState<'emails' | 'filters'>('emails');
  const [parsing, setParsing] = useState(false);
  const [autoAnswering, setAutoAnswering] = useState(false);
  const [useCorporate, setUseCorporate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<CampaignSetupResponse | null>(null);
  const [submitError, setSubmitError] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<CampaignSetupRequest>({});

  const watchedCountry = watch('country');
  const watchedObjectType = watch('object_type');

  // Use custom hooks
  const senderAccounts = useSenderAccounts(useCorporate);
  const recipientCount = useRecipientCount(
    recipientMode === 'filters',
    watchedCountry,
    watchedObjectType
  );

  const handleRecipientModeChange = (mode: 'emails' | 'filters') => {
    setRecipientMode(mode);
    if (mode === 'emails') {
      setValue('country', '');
      setValue('object_type', '');
    } else {
      setValue('emails', []);
    }
  };

  const parseEmails = (emailString: string): string[] => {
    return emailString
      .split(/[,\n;]/)
      .map(email => email.trim())
      .filter(email => email.length > 0);
  };

  const validateForm = (data: CampaignSetupRequest): { isValid: boolean; errors: string[] } => {
    const validationErrors: string[] = [];

    // Check recipient mode validation
    if (recipientMode === 'emails') {
      // Get value from ref instead of direct DOM query
      const emailsValue = emailsTextareaRef.current?.value || '';
      const emails = parseEmails(emailsValue);
      
      if (emails.length === 0) {
        validationErrors.push('At least one email address is required');
      }
    }

    if (recipientMode === 'filters' && (!data.country || !data.object_type)) {
      validationErrors.push('Country and object type are required');
    }

    if (senderAccounts.accounts.length === 0) {
      validationErrors.push(`No ${useCorporate ? 'corporate' : 'personal'} sender accounts available`);
    } else if (senderAccounts.selectedIds.length === 0) {
      validationErrors.push('Select at least one sender account');
    }

    // Check required prompts
    if (!data.subject_prompt?.trim()) {
      validationErrors.push('Subject prompt is required');
    }

    if (!data.body_prompt?.trim()) {
      validationErrors.push('Body prompt is required');
    }

    // Check communication style fields
    if (!data.tov?.trim()) {
      validationErrors.push('Tone of Voice is required');
    }

    if (!data.style?.trim()) {
      validationErrors.push('Writing Style is required');
    }

    if (!data.language?.trim()) {
      validationErrors.push('Language is required');
    }

    // Check conditional fields
    if (parsing && !data.parsing_prompt?.trim()) {
      validationErrors.push('What to find is required when website parsing is enabled');
    }

    if (autoAnswering && !data.reply_prompt?.trim()) {
      validationErrors.push('Reply prompt is required when auto-answering is enabled');
    }

    return {
      isValid: validationErrors.length === 0,
      errors: validationErrors
    };
  };

  const handleFormSubmit = async (data: CampaignSetupRequest) => {
    const validation = validateForm(data);
    
    if (validation.isValid) {
      setSubmitError('');
      setShowConfirmation(true);
    } else {
      setSubmitError(validation.errors.join(', '));
    }
  };

  const confirmSubmit = async () => {
    setShowConfirmation(false);
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitResult(null);

    try {
      const data = watch();

      // Set flags
      data.use_corporate = useCorporate;
      data.auto_answering = autoAnswering;
      data.parsing = parsing;

      // Convert emails from textarea ref instead of DOM query
      if (recipientMode === 'emails') {
        const emailsText = emailsTextareaRef.current?.value || '';
        data.emails = parseEmails(emailsText);
      }

      // Frontend validation
      const validation = validateForm(data);
      if (!validation.isValid) {
        setSubmitError(validation.errors.join(', '));
        setIsSubmitting(false);
        return;
      }

      data.sender_account_ids = senderAccounts.selectedIds;

      const result = await apiClient.post<CampaignSetupResponse>(
        API_ENDPOINTS.emailsSetup,
        data
      );

      setSubmitResult(result);
      
      // Redirect to campaign status page
      if (result.campaign_id) {
        setTimeout(() => {
          navigate(`/campaigns/${result.campaign_id}`);
        }, 2000);
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="emails-setup-page narrow-container">
        <h1>Email Campaign Setup</h1>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="campaign-form">
          <div className="form-section">
            <h3>Campaign Details</h3>
            <div className="form-group">
              <label htmlFor="campaign-name">Campaign Name</label>
              <input
                id="campaign-name"
                type="text"
                className="form-control"
                placeholder="Enter a name for this campaign (optional)"
                {...register('name')}
              />
            </div>
          </div>

          {/* Recipient Mode */}
          <div className="form-section">
            <h3>Recipient Mode</h3>

            <div className="radio-group">
              <div className="radio-option">
                <input
                  type="radio"
                  id="emails-mode"
                  name="recipient-mode"
                  checked={recipientMode === 'emails'}
                  onChange={() => handleRecipientModeChange('emails')}
                />
                <label htmlFor="emails-mode">Email List</label>
              </div>
              <div className="radio-option">
                <input
                  type="radio"
                  id="filters-mode"
                  name="recipient-mode"
                  checked={recipientMode === 'filters'}
                  onChange={() => handleRecipientModeChange('filters')}
                />
                <label htmlFor="filters-mode">Database Filters</label>
              </div>
            </div>

            {recipientMode === 'emails' && (
              <TextareaField
                label="Email Addresses"
                name="emails"
                ref={emailsTextareaRef}
                value={watch('emails') as any}
                onChange={(e) => setValue('emails', e.target.value as any)}
                error={errors.emails?.message}
                hint="Enter email addresses separated by: new line (Enter), comma (,), or semicolon (;). Example: user1@example.com, user2@example.com or one per line"
                required
                rows={6}
              />
            )}

            {recipientMode === 'filters' && (
              <>
                <div className="form-row">
                  <CountrySelect
                    label="Country"
                    name="country"
                    value={watch('country') || ''}
                    onChange={(e) => setValue('country', e.target.value)}
                    error={errors.country?.message}
                    required={recipientMode === 'filters'}
                    placeholder="Select country..."
                  />
                  <ObjectTypeSelect
                    label="Object Type"
                    name="object_type"
                    value={watch('object_type') || ''}
                    onChange={(e) => setValue('object_type', e.target.value)}
                    error={errors.object_type?.message}
                    required={recipientMode === 'filters'}
                  />
                </div>
                {watchedCountry && watchedObjectType && (
                  <div
                    className={`count-display ${
                      recipientCount.error
                        ? 'error'
                        : recipientCount.loading
                        ? 'loading'
                        : recipientCount.count === 0
                        ? 'zero'
                        : 'success'
                    }`}
                  >
                    {recipientCount.error
                      ? recipientCount.error
                      : recipientCount.loading
                      ? 'Counting matching B2B objects...'
                      : (
                        <>
                          Found{' '}
                          <span className="count-number">
                            {recipientCount.count ?? 0}
                          </span>{' '}
                          B2B objects with email for the selected filters
                        </>
                      )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Generation Prompts */}
          <div className="form-section">
            <h3>Generation Prompts</h3>

            <TextareaField
              label="Subject Line Prompt"
              name="subject_prompt"
              value={watch('subject_prompt') || ''}
              onChange={(e) => setValue('subject_prompt', e.target.value)}
              error={errors.subject_prompt?.message}
              required
              rows={3}
              placeholder="Describe what the email subject should be like..."
            />

            <TextareaField
              label="Email Body Prompt"
              name="body_prompt"
              value={watch('body_prompt') || ''}
              onChange={(e) => setValue('body_prompt', e.target.value)}
              error={errors.body_prompt?.message}
              required
              rows={6}
              placeholder="Describe what the email content should be like..."
            />
          </div>

          {/* Website Parsing */}
          <div className="form-section">
            <h3>Website Parsing</h3>

            <ToggleField
              label="Enable Website Parsing"
              name="parsing"
              checked={parsing}
              onChange={(e) => {
                const checked = e.target.checked;
                setParsing(checked);
                setValue('parsing', checked);
                if (!checked) {
                  setValue('parsing_prompt', '');
                }
              }}
            />

            {parsing && (
              <TextareaField
                label="What to Find"
                name="parsing_prompt"
                value={watch('parsing_prompt') || ''}
                onChange={(e) => setValue('parsing_prompt', e.target.value)}
                error={errors.parsing_prompt?.message}
                required
                rows={4}
                placeholder="Describe what information to find on the website..."
              />
            )}
          </div>

          {/* Auto Responses */}
          <div className="form-section">
            <h3>Auto Responses</h3>

            <ToggleField
              label="Enable Auto Responses"
              name="auto_answering"
              checked={autoAnswering}
              onChange={(e) => {
                const checked = e.target.checked;
                setAutoAnswering(checked);
                setValue('auto_answering', checked);
                if (!checked) {
                  setValue('reply_prompt', '');
                }
              }}
            />

            {autoAnswering && (
              <TextareaField
                label="Auto Response Prompt"
                name="reply_prompt"
                value={watch('reply_prompt') || ''}
                onChange={(e) => setValue('reply_prompt', e.target.value)}
                error={errors.reply_prompt?.message}
                required
                rows={4}
                placeholder="Describe how to generate auto responses..."
              />
            )}
          </div>

          {/* Communication Style */}
          <div className="form-section">
            <h3>Communication Style</h3>

            <div className="form-row">
              <TovSelect
                label="Tone of Voice (TOV)"
                name="tov"
                value={watch('tov') || ''}
                onChange={(e) => setValue('tov', e.target.value as CampaignSetupRequest['tov'])}
                placeholder="Select tone of voice..."
                required
              />
              <WritingStyleSelect
                label="Writing Style"
                name="style"
                value={watch('style') || ''}
                onChange={(e) => setValue('style', e.target.value as CampaignSetupRequest['style'])}
                placeholder="Select writing style..."
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="language">
                Language
                <span className="required">*</span>
              </label>
              <input
                id="language"
                type="text"
                className="form-control"
                placeholder="e.g., English, Ukrainian, Polish..."
                {...register('language')}
              />
            </div>
          </div>

          {/* Sending Settings */}
          <div className="form-section">
            <h3>Sending Settings</h3>

            <ToggleField
              label="Use Corporate Domain"
              name="use_corporate"
              checked={useCorporate}
              onChange={(e) => {
                const checked = e.target.checked;
                setUseCorporate(checked);
                setValue('use_corporate', checked);
              }}
            />

            <div className="form-row">
              <input
                type="number"
                className="form-control"
                placeholder="Daily Limit (optional)"
                {...register('daily_limit', { valueAsNumber: true, min: 1 })}
              />
              <input
                type="text"
                className="form-control"
                placeholder="Timezone (+2 or -2)"
                {...register('timezone')}
              />
            </div>

            <div>
              <h4>Sender Accounts</h4>
              {senderAccounts.loading && (
                <div className="sender-accounts-loading">Loading sender accounts...</div>
              )}
              {senderAccounts.error && (
                <div className="sender-accounts-error">{senderAccounts.error}</div>
              )}
              {!senderAccounts.loading && !senderAccounts.error && (
                <div>
                  {senderAccounts.accounts.length === 0 ? (
                    <div className="sender-accounts-empty">
                      No {useCorporate ? 'corporate' : 'personal'} sender accounts available. Add sender accounts first.
                    </div>
                  ) : (
                    <div className="sender-accounts-list">
                      {senderAccounts.accounts.map((acc) => (
                        <label key={acc.id} className="sender-account-item">
                          <input
                            type="checkbox"
                            checked={senderAccounts.selectedIds.includes(acc.id)}
                            onChange={(e) => senderAccounts.toggleAccount(acc.id, e.target.checked)}
                          />
                          <span>
                            {acc.email}
                            {acc.first_name || acc.last_name ? (
                              <span className="sender-account-name">
                                {' '}
                                ({[acc.first_name, acc.last_name].filter(Boolean).join(' ')})
                              </span>
                            ) : null}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Error Messages */}
          {submitError && (
            <div className="error-alert">
              <strong>Error:</strong> {submitError}
            </div>
          )}

          {/* Submit Result */}
          {submitResult && (
            <div className="success-message">
              <strong>Campaign created successfully!</strong>
              <p><strong>Queue:</strong> {submitResult.queued} emails</p>
              <p><strong>Message:</strong> {submitResult.message}</p>
              <p className="redirect-message">Redirecting to campaign status...</p>
            </div>
          )}

          {/* Confirmation Dialog */}
          {showConfirmation && (
            <div className="confirmation-dialog">
              <div className="confirmation-content">
                <h3>Confirm Campaign Creation</h3>
                <p>Are you sure you want to create this email campaign with the current settings?</p>
                <div className="confirmation-buttons">
                  <button
                    type="button"
                    className="button cancel-btn"
                    onClick={() => setShowConfirmation(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="button create-btn"
                    onClick={confirmSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating Campaign...' : 'Create Campaign'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating Campaign...' : 'Create Campaign'}
          </button>
        </form>
      </div>
    </div>
  );
};
