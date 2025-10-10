import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { TextareaField } from '../../components/TextareaField';
import { ToggleField } from '../../components/ToggleField';
import { CountrySelect } from '../../components/CountrySelect';
import { ObjectTypeSelect } from '../../components/ObjectTypeSelect';
import { TovSelect } from '../../components/TovSelect';
import { WritingStyleSelect } from '../../components/WritingStyleSelect';
import { CampaignSetupRequest, CampaignSetupResponse } from '../../types/api';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';

export const EmailsSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [recipientMode, setRecipientMode] = useState<'emails' | 'filters'>('emails');
  const [parsing, setParsing] = useState(false);
  const [autoAnswering, setAutoAnswering] = useState(false);
  const [useCorporate, setUseCorporate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<CampaignSetupResponse | null>(null);
  const [submitError, setSubmitError] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch, setError, clearErrors } = useForm<CampaignSetupRequest>({});

  const watchedEmails = watch('emails');
  const watchedCountry = watch('country');
  const watchedObjectType = watch('object_type');
  const watchedParsingPrompt = watch('parsing_prompt');
  const watchedReplyPrompt = watch('reply_prompt');

  // Валідація взаємовиключення режимів одержувачів
  React.useEffect(() => {
    if (recipientMode === 'emails' && watchedCountry && watchedObjectType) {
      setError('country', { message: 'Cannot use both recipient modes' });
      setError('object_type', { message: 'Cannot use both recipient modes' });
    } else if (recipientMode === 'filters' && watchedEmails && watchedEmails.length > 0) {
      setError('emails', { message: 'Cannot use both recipient modes' });
    } else {
      clearErrors(['emails', 'country', 'object_type']);
    }
  }, [recipientMode, watchedEmails, watchedCountry, watchedObjectType, setError, clearErrors]);

  // Валідація умовних полів
  React.useEffect(() => {
    if (parsing && !watchedParsingPrompt) {
      setError('parsing_prompt', { message: 'This field is required when parsing is enabled' });
    } else {
      clearErrors('parsing_prompt');
    }
  }, [parsing, watchedParsingPrompt, setError, clearErrors]);

  React.useEffect(() => {
    if (autoAnswering && !watchedReplyPrompt) {
      setError('reply_prompt', { message: 'This field is required when auto-answering is enabled' });
    } else {
      clearErrors('reply_prompt');
    }
  }, [autoAnswering, watchedReplyPrompt, setError, clearErrors]);

  const handleRecipientModeChange = (mode: 'emails' | 'filters') => {
    setRecipientMode(mode);
    // Clear opposite mode fields
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

  const handleFormSubmit = async (data: CampaignSetupRequest) => {
    // Validate form before showing confirmation
    let isValid = true;
    let validationErrors: string[] = [];

    // Check recipient mode validation
    if (recipientMode === 'emails') {
      const emailsValue = data.emails;
      let emails: string[] = [];
      
      if (typeof emailsValue === 'string') {
        emails = parseEmails(emailsValue);
      } else if (Array.isArray(emailsValue)) {
        emails = emailsValue;
      }
      
      if (emails.length === 0) {
        isValid = false;
        validationErrors.push('At least one email address is required');
      }
    }

    if (recipientMode === 'filters' && (!data.country || !data.object_type)) {
      isValid = false;
      validationErrors.push('Country and object type are required');
    }

    // Check required prompts
    if (!data.subject_prompt?.trim()) {
      isValid = false;
      validationErrors.push('Subject prompt is required');
    }

    if (!data.body_prompt?.trim()) {
      isValid = false;
      validationErrors.push('Body prompt is required');
    }

    // Check communication style fields
    if (!data.tov?.trim()) {
      isValid = false;
      validationErrors.push('Tone of Voice is required');
    }

    if (!data.style?.trim()) {
      isValid = false;
      validationErrors.push('Writing Style is required');
    }

    if (!data.language?.trim()) {
      isValid = false;
      validationErrors.push('Language is required');
    }

    // Check conditional fields
    if (parsing && !data.parsing_prompt?.trim()) {
      isValid = false;
      validationErrors.push('What to find is required when website parsing is enabled');
    }

    if (autoAnswering && !data.reply_prompt?.trim()) {
      isValid = false;
      validationErrors.push('Reply prompt is required when auto-answering is enabled');
    }

    if (isValid) {
      setSubmitError(''); // Clear any previous errors
      setShowConfirmation(true);
    } else {
      setSubmitError(validationErrors.join(', '));
    }
  };

  const confirmSubmit = async () => {
    setShowConfirmation(false);
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitResult(null);

    try {
      const data = watch();

      // Convert emails from string to array
      if (typeof data.emails === 'string') {
        data.emails = parseEmails(data.emails);
      } else if (data.emails && typeof data.emails === 'object' && data.emails.length === 0) {
        const emailsText = (document.querySelector('[name="emails"]') as HTMLTextAreaElement)?.value || '';
        data.emails = parseEmails(emailsText);
      }

      // Frontend validation
      if (recipientMode === 'emails' && (!data.emails || data.emails.length === 0)) {
        setSubmitError('At least one email address is required');
        setIsSubmitting(false);
        return;
      }

      if (recipientMode === 'filters' && (!data.country || !data.object_type)) {
        setSubmitError('Country and object type are required');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(buildApiUrl(API_ENDPOINTS.emailsSetup), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const result: CampaignSetupResponse = await response.json();
      setSubmitResult(result);
      
      // Redirect to campaign status page
      if (result.campaign_id) {
        setTimeout(() => {
          navigate(`/campaigns/${result.campaign_id}`);
        }, 2000); // Give user 2 seconds to see the success message
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="emails-setup-page narrow-container">
      <h1>Email Campaign Setup</h1>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="campaign-form">
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
              value={typeof watchedEmails === 'string' ? watchedEmails : Array.isArray(watchedEmails) ? watchedEmails.join('\n') : ''}
              onChange={(e) => {
                setValue('emails', e.target.value as any);
              }}
              error={errors.emails?.message}
              hint="Enter email addresses separated by: new line (Enter), comma (,), or semicolon (;). Example: user1@example.com, user2@example.com or one per line"
              required
              rows={6}
            />
          )}

          {recipientMode === 'filters' && (
            <>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <CountrySelect
                    label="Country"
                    name="country"
                    value={watch('country') || ''}
                    onChange={(e) => setValue('country', e.target.value)}
                    error={errors.country?.message}
                    required={recipientMode === 'filters'}
                    placeholder="Select country..."
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <ObjectTypeSelect
                    label="Object Type"
                    name="object_type"
                    value={watch('object_type') || ''}
                    onChange={(e) => setValue('object_type', e.target.value)}
                    error={errors.object_type?.message}
                    required={recipientMode === 'filters'}
                  />
                </div>
              </div>
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
              setParsing(e.target.checked);
              if (!e.target.checked) {
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
              setAutoAnswering(e.target.checked);
              if (!e.target.checked) {
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

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <TovSelect
                label="Tone of Voice (TOV)"
                name="tov"
                value={watch('tov') || ''}
                onChange={(e) => setValue('tov', e.target.value as CampaignSetupRequest['tov'])}
                placeholder="Select tone of voice..."
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <WritingStyleSelect
                label="Writing Style"
                name="style"
                value={watch('style') || ''}
                onChange={(e) => setValue('style', e.target.value as CampaignSetupRequest['style'])}
                placeholder="Select writing style..."
                required
              />
            </div>
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
            onChange={(e) => setUseCorporate(e.target.checked)}
          />

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <input
                type="number"
                className="form-control"
                placeholder="Daily Limit (optional)"
                {...register('daily_limit', { valueAsNumber: true, min: 1 })}
              />
            </div>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                className="form-control"
                placeholder="Timezone (+2 or -2)"
                {...register('timezone')}
              />
            </div>
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
  );
};
