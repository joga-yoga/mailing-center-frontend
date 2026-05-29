import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { TextareaField } from '../../components/TextareaField';
import { ToggleField } from '../../components/ToggleField';
import { CountrySelect } from '../../components/CountrySelect';
import { ObjectTypeSelect } from '../../components/ObjectTypeSelect';
import { TovSelect } from '../../components/TovSelect';
import { WritingStyleSelect } from '../../components/WritingStyleSelect';
import { CampaignSetupRequest, CampaignSetupResponse, MailerAgentConfig } from '../../types/api';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';

type SenderAccountOption = {
  id: string;
  email: string;
  server_id: string;
  first_name?: string | null;
  last_name?: string | null;
  is_active: boolean;
};

export const EmailsSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [recipientMode, setRecipientMode] = useState<'emails' | 'filters'>('emails');
  const [parsing, setParsing] = useState(false);
  const [autoAnswering, setAutoAnswering] = useState(false);
  const [singleReplyOnly, setSingleReplyOnly] = useState(false);
  const [useCorporate, setUseCorporate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<CampaignSetupResponse | null>(null);
  const [submitError, setSubmitError] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [matchingCount, setMatchingCount] = useState<number | null>(null);
  const [matchingCountLoading, setMatchingCountLoading] = useState(false);
  const [matchingCountError, setMatchingCountError] = useState<string>('');
  const [senderAccounts, setSenderAccounts] = useState<SenderAccountOption[]>([]);
  const [senderAccountsLoading, setSenderAccountsLoading] = useState(false);
  const [senderAccountsError, setSenderAccountsError] = useState<string>('');
  const [selectedSenderIds, setSelectedSenderIds] = useState<string[]>([]);
  // B2B objects preview (UI selection + delete)
  type B2BItem = { place_id: string; name: string; email?: string | null };
  const [objects, setObjects] = useState<B2BItem[]>([]);
  const [selectedObjects, setSelectedObjects] = useState<Record<string, boolean>>({});
  const [objectToDelete, setObjectToDelete] = useState<B2BItem | null>(null);
  const [deletingPlaceId, setDeletingPlaceId] = useState<string | null>(null);
  const [objectsError, setObjectsError] = useState<string>('');
  const [availableTimezones, setAvailableTimezones] = useState<string[]>([]);
  const [timezonesLoading, setTimezonesLoading] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState<string>('');
  const [mailerAgentMode, setMailerAgentMode] = useState<CampaignSetupRequest['mailer_agent_mode']>('legacy_assistant');
  const [mailerAgentDraftMode, setMailerAgentDraftMode] = useState<CampaignSetupRequest['mailer_agent_draft_mode']>('draft_only');
  const [mailerAgentWebsiteContextEnabled, setMailerAgentWebsiteContextEnabled] = useState(true);
  const [mailerAgentConfig, setMailerAgentConfig] = useState<MailerAgentConfig>({
    personalization_level: 'medium',
    max_body_chars: 1200,
    max_subject_chars: 120,
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch, setError, clearErrors } = useForm<CampaignSetupRequest>({});

  const watchedEmails = watch('emails');
  const watchedCountry = watch('country');
  const watchedObjectType = watch('object_type');
  const watchedParsingPrompt = watch('parsing_prompt');
  const watchedReplyPrompt = watch('reply_prompt');

  const updateMailerAgentConfig = <K extends keyof MailerAgentConfig>(
    key: K,
    value: MailerAgentConfig[K]
  ) => {
    setMailerAgentConfig(prev => ({ ...prev, [key]: value }));
  };

  const textToList = (value?: string | null): string[] => {
    return (value || '')
      .split('\n')
      .map(item => item.trim())
      .filter(Boolean);
  };

  const listToText = (items?: string[]): string => (items || []).join('\n');

  React.useEffect(() => {
    const fetchAgentDefaults = async () => {
      try {
        const response = await fetch(buildApiUrl(API_ENDPOINTS.agentDefaultSettings));
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        setMailerAgentMode(data.mailer_agent_mode || 'legacy_assistant');
        setMailerAgentDraftMode(data.mailer_agent_draft_mode || 'draft_only');
        setMailerAgentWebsiteContextEnabled(data.mailer_agent_website_context_enabled ?? true);
        setMailerAgentConfig(prev => ({
          ...prev,
          ...(data.mailer_agent_config || {}),
          personalization_level: data.mailer_agent_config?.personalization_level || prev.personalization_level || 'medium',
          max_body_chars: data.mailer_agent_config?.max_body_chars || prev.max_body_chars || 1200,
          max_subject_chars: data.mailer_agent_config?.max_subject_chars || prev.max_subject_chars || 120,
        }));
      } catch {
        // Defaults are optional; backend will still apply safe fallbacks.
      }
    };

    fetchAgentDefaults();
  }, []);
  React.useEffect(() => {
    const fetchSenderAccounts = async () => {
      setSenderAccountsLoading(true);
      setSenderAccountsError('');
      try {
        const response = await fetch(
          buildApiUrl(`${API_ENDPOINTS.senderAccounts}?active_only=true`)
        );
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || errorData.message || `Server error: ${response.status}`);
        }
        const data: SenderAccountOption[] = await response.json();
        setSenderAccounts(data);
      } catch (err) {
        setSenderAccountsError(err instanceof Error ? err.message : 'Failed to load sender accounts');
      } finally {
        setSenderAccountsLoading(false);
      }
    };

    fetchSenderAccounts();
  }, []);

  React.useEffect(() => {
    if (!senderAccounts.length) {
      setSelectedSenderIds([]);
      return;
    }
    syncSelectionWithServerType(useCorporate, senderAccounts);
  }, [useCorporate, senderAccounts]);

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

  React.useEffect(() => {
    if (recipientMode !== 'filters' || !watchedCountry || !watchedObjectType) {
      setMatchingCount(null);
      setMatchingCountError('');
      setMatchingCountLoading(false);
      setObjects([]); // clear objects when filters incomplete
      return;
    }

    let cancelled = false;
    setMatchingCountLoading(true);
    setMatchingCountError('');

    const fetchCount = async () => {
      try {
        const response = await fetch(
          buildApiUrl(API_ENDPOINTS.b2bCount(watchedCountry, watchedObjectType))
        );
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || errorData.message || `Server error: ${response.status}`);
        }
        const data = await response.json();
        if (!cancelled) {
          setMatchingCount(typeof data.count === 'number' ? data.count : 0);
        }
      } catch (err) {
        if (!cancelled) {
          setMatchingCount(null);
          setMatchingCountError(err instanceof Error ? err.message : 'Failed to load count');
        }
      } finally {
        if (!cancelled) {
          setMatchingCountLoading(false);
        }
      }
    };

    fetchCount();

    return () => {
      cancelled = true;
    };
  }, [recipientMode, watchedCountry, watchedObjectType]);

  // Helper function to extract timezone name from formatted string like "UTC+01:00 (Europe/Warsaw)"
  const extractTimezoneName = (formatted: string): string => {
    const match = formatted.match(/\(([^)]+)\)/);
    return match ? match[1] : formatted;
  };

  // Load timezones for selected country (only when using filters mode)
  React.useEffect(() => {
    if (recipientMode !== 'filters' || !watchedCountry) {
      setAvailableTimezones([]);
      setSelectedTimezone('');
      setValue('timezone', '');
      return;
    }

    let cancelled = false;
    setTimezonesLoading(true);
    
    const fetchTimezones = async () => {
      try {
        const url = buildApiUrl(API_ENDPOINTS.timezonesByCountry(watchedCountry));
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to load timezones: ${res.status}`);
        }
        const data = await res.json();
        const timezones: string[] = Array.isArray(data?.timezones) ? data.timezones : [];
        
        if (!cancelled) {
          setAvailableTimezones(timezones);
          // Auto-select first timezone if available (default selection)
          if (timezones.length > 0) {
            const firstTz = timezones[0];
            const tzName = extractTimezoneName(firstTz);
            setSelectedTimezone(firstTz); // Display formatted
            setValue('timezone', tzName); // Save only name
          } else {
            setSelectedTimezone('');
            setValue('timezone', '');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setAvailableTimezones([]);
          setSelectedTimezone('');
          setValue('timezone', '');
        }
      } finally {
        if (!cancelled) {
          setTimezonesLoading(false);
        }
      }
    };

    fetchTimezones();

    return () => {
      cancelled = true;
    };
  }, [recipientMode, watchedCountry, setValue]);

  // Load real B2B objects list (limited) for preview when filters are chosen
  React.useEffect(() => {
    if (recipientMode !== 'filters' || !watchedCountry || !watchedObjectType) {
      setObjects([]);
      setSelectedObjects({});
      return;
    }
    let aborted = false;
    const controller = new AbortController();
    (async () => {
      try {
        const url = buildApiUrl(API_ENDPOINTS.b2bSearch);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: null,
            type: watchedObjectType,
            country: watchedCountry,
            has_email: true
          }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Failed to load objects: ${res.status}`);
        const data = await res.json();
        const items: B2BItem[] = Array.isArray(data?.items)
          ? data.items.map((it: any) => ({ place_id: it.place_id, name: it.name || it.place_id, email: it.email }))
          : [];
        if (!aborted) {
          setObjects(items);
          // Keep existing selections; initialize missing as false
          setSelectedObjects(prev => {
            const next = { ...prev };
            // If this is the first load (no previous selection), select all by default
            if (Object.keys(prev).length === 0) {
              items.forEach(it => {
                next[it.place_id] = true;
              });
              return next;
            }
            // Otherwise preserve existing, and mark new items as selected by default
            items.forEach(it => {
              if (next[it.place_id] === undefined) {
                next[it.place_id] = true;
              }
            });
            return next;
          });
        }
      } catch (_e) {
        if (!aborted) {
          setObjects([]);
        }
      }
    })();
    return () => {
      aborted = true;
      controller.abort();
    };
  }, [recipientMode, watchedCountry, watchedObjectType]);

  function syncSelectionWithServerType(useCorporateValue: boolean, accounts: SenderAccountOption[]) {
    const serverId = useCorporateValue ? '2' : '1';
    const filtered = accounts.filter((acc) => acc.server_id === serverId);
    setSelectedSenderIds(filtered.map((acc) => acc.id));
  }

  const handleSenderSelectionChange = (accountId: string, checked: boolean) => {
    setSelectedSenderIds((prev) => {
      if (checked) {
        if (prev.includes(accountId)) {
          return prev;
        }
        return [...prev, accountId];
      }
      return prev.filter((id) => id !== accountId);
    });
  };

  const handleRecipientModeChange = (mode: 'emails' | 'filters') => {
    setRecipientMode(mode);
    // Clear opposite mode fields
    if (mode === 'emails') {
      setValue('country', '');
      setValue('object_type', '');
      setAvailableTimezones([]);
      setSelectedTimezone('');
      // Keep timezone value if it was set in filters mode (user can still edit it in emails mode)
    } else {
      setValue('emails', []);
      // Timezone will be fetched when country is selected
    }
  };

  const parseEmails = (emailString: string): string[] => {
    return emailString
      .split(/[,\n;]/)
      .map(email => email.trim())
      .filter(email => email.length > 0);
  };

  const filteredSenderAccounts = React.useMemo(
    () => senderAccounts.filter((acc) => acc.server_id === (useCorporate ? '2' : '1')),
    [senderAccounts, useCorporate]
  );

  const allSenderAccountsSelected =
    filteredSenderAccounts.length > 0 &&
    filteredSenderAccounts.every((acc) => selectedSenderIds.includes(acc.id));

  const handleToggleAllSenderAccounts = (checked: boolean) => {
    setSelectedSenderIds(checked ? filteredSenderAccounts.map((acc) => acc.id) : []);
  };

  const allObjectsSelected =
    objects.length > 0 && objects.every((obj) => !!selectedObjects[obj.place_id]);

  const handleToggleAllObjects = (checked: boolean) => {
    setSelectedObjects((prev) => {
      const next = { ...prev };
      objects.forEach((obj) => {
        next[obj.place_id] = checked;
      });
      return next;
    });
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

    const relevantAccounts = filteredSenderAccounts;
    if (relevantAccounts.length === 0) {
      validationErrors.push(`No ${useCorporate ? 'corporate' : 'personal'} sender accounts available`);
      isValid = false;
    } else if (selectedSenderIds.length === 0) {
      isValid = false;
      validationErrors.push('Select at least one sender account');
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

    if (mailerAgentMode === 'responses') {
      if (!mailerAgentConfig.first_contact_instruction?.trim()) {
        isValid = false;
        validationErrors.push('Mailer Agent first contact instructions are required in Responses mode');
      }
      if (!mailerAgentConfig.company_context?.trim() && !mailerAgentConfig.offer_context?.trim()) {
        isValid = false;
        validationErrors.push('Mailer Agent needs company/platform context or offer context in Responses mode');
      }
      const maxBody = Number(mailerAgentConfig.max_body_chars || 0);
      if (maxBody < 300 || maxBody > 2000) {
        isValid = false;
        validationErrors.push('Mailer Agent max body length must be between 300 and 2000 characters');
      }
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

      // Ensure use_corporate is included in form data
      data.use_corporate = useCorporate;
      
      // Ensure auto_answering and parsing are included in form data
      data.auto_answering = autoAnswering;
      data.single_reply_only = singleReplyOnly;
      data.parsing = parsing;

      // Convert emails from string to array
      if (typeof data.emails === 'string') {
        data.emails = parseEmails(data.emails);
      } else if (data.emails && typeof data.emails === 'object' && data.emails.length === 0) {
        const emailsText = (document.querySelector('[name="emails"]') as HTMLTextAreaElement)?.value || '';
        data.emails = parseEmails(emailsText);
      }

      // When using filters, pass list of explicitly included B2B place_ids based on checkboxes
      if (recipientMode === 'filters') {
        const includedIds = objects
          .filter(obj => selectedObjects[obj.place_id])
          .map(obj => obj.place_id);

        if (includedIds.length === 0) {
          setSubmitError('Select at least one B2B object or adjust filters');
          setIsSubmitting(false);
          return;
        }

        data.included_place_ids = includedIds;
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

      const currentServerId = useCorporate ? '2' : '1';
      const relevantAccounts = senderAccounts.filter((acc) => acc.server_id === currentServerId);
      if (relevantAccounts.length === 0) {
        setSubmitError(`No ${useCorporate ? 'corporate' : 'personal'} sender accounts available`);
        setIsSubmitting(false);
        return;
      }

      if (!selectedSenderIds.length) {
        setSubmitError('Select at least one sender account');
        setIsSubmitting(false);
        return;
      }

      data.sender_account_ids = selectedSenderIds;
      data.mailer_agent_mode = mailerAgentMode;
      data.mailer_agent_draft_mode = mailerAgentDraftMode;
      data.mailer_agent_website_context_enabled = mailerAgentWebsiteContextEnabled;
      data.mailer_agent_config = {
        ...mailerAgentConfig,
        forbidden_phrases: mailerAgentConfig.forbidden_phrases || [],
        required_points: mailerAgentConfig.required_points || [],
        max_body_chars: Number(mailerAgentConfig.max_body_chars || 1200),
        max_subject_chars: Number(mailerAgentConfig.max_subject_chars || 120),
      };

      // Debug logging
      console.log('Sending campaign data:', {
        ...data,
        auto_answering: data.auto_answering,
        parsing: data.parsing,
        use_corporate: data.use_corporate,
        mailer_agent_mode: data.mailer_agent_mode,
        mailer_agent_draft_mode: data.mailer_agent_draft_mode,
      });

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

  const handleDeleteObject = async () => {
    if (!objectToDelete) return;
    setDeletingPlaceId(objectToDelete.place_id);
    setObjectsError('');
    try {
      const response = await fetch(
        buildApiUrl(`/api/b2b/${encodeURIComponent(objectToDelete.place_id)}`),
        { method: 'DELETE' }
      );
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.detail || errorBody.message || `Failed to delete object (${response.status})`);
      }

      setObjects(prev => prev.filter(o => o.place_id !== objectToDelete.place_id));
      setSelectedObjects(prev => {
        const next = { ...prev };
        delete next[objectToDelete.place_id];
        return next;
      });
      setMatchingCount(prev => (prev !== null ? Math.max(0, prev - 1) : prev));
      setObjectToDelete(null);
    } catch (err) {
      setObjectsError(err instanceof Error ? err.message : 'Failed to delete object');
    } finally {
      setDeletingPlaceId(null);
    }
  };

  return (
    <>
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
              <div className="filters-row">
                <div style={{ flex: 1 }}>
                  <CountrySelect
                    label="Country"
                    name="country"
                    value={watch('country') || ''}
                    onChange={(e) => setValue('country', e.target.value)}
                    error={errors.country?.message}
                    required={recipientMode === 'filters'}
                    placeholder="Select country..."
                    selectedObjectType={watch('object_type') || ''}
                  />
                  {/* Timezone selection below country select */}
                  {watchedCountry && (
                    <div style={{ marginTop: '12px' }}>
                      {timezonesLoading && (
                        <div style={{ color: '#0d6efd', fontSize: '14px', marginBottom: '8px' }}>
                          Loading timezones...
                        </div>
                      )}
                      {!timezonesLoading && availableTimezones.length === 0 && watchedCountry && (
                        <div style={{ color: '#6c757d', fontSize: '14px', marginBottom: '8px' }}>
                          No timezones found for this country
                        </div>
                      )}
                      {!timezonesLoading && availableTimezones.length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#212529' }}>
                            Select Timezone:
                          </label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {availableTimezones.map((tzFormatted) => (
                              <label
                                key={tzFormatted}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  fontSize: '14px',
                                  cursor: 'pointer',
                                  padding: '6px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: selectedTimezone === tzFormatted ? '#e7f3ff' : 'transparent',
                                  transition: 'background-color 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                  if (selectedTimezone !== tzFormatted) {
                                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (selectedTimezone !== tzFormatted) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }
                                }}
                              >
                                <input
                                  type="radio"
                                  name="timezone-select"
                                  value={tzFormatted}
                                  checked={selectedTimezone === tzFormatted}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    const tzNameValue = extractTimezoneName(value);
                                    setSelectedTimezone(value); // Display formatted
                                    setValue('timezone', tzNameValue); // Save only name
                                  }}
                                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                                <span>{tzFormatted}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <ObjectTypeSelect
                    label="Object Type"
                    name="object_type"
                    value={watch('object_type') || ''}
                    onChange={(e) => setValue('object_type', e.target.value)}
                    error={errors.object_type?.message}
                    required={recipientMode === 'filters'}
                    placeholder="Select object type..."
                    selectedCountry={watch('country') || ''}
                  />
                </div>
              </div>
              <div className="filters-actions">
                <button
                  type="button"
                  onClick={() => {
                    setValue('country', '');
                    setValue('object_type', '');
                    setObjects([]);
                    setSelectedObjects({});
                    setAvailableTimezones([]);
                    setSelectedTimezone('');
                    setValue('timezone', '');
                  }}
                  className="button button-secondary clear-btn"
                  title="Clear country and object type"
                >
                  Clear
                </button>
              </div>

              {/* Objects list (UI only; clickable checkboxes, no side effects) */}
              {(watchedCountry && watchedObjectType) && (
                <div className="objects-preview">
                  <h4 style={{ marginBottom: '10px' }}>
                    Found{' '}
                    <span
                      style={{
                        fontWeight: 700,
                        color:
                          matchingCountError
                            ? '#dc3545'
                            : (matchingCountLoading
                              ? '#0d6efd'
                              : (matchingCount === 0 ? '#dc3545' : '#0b5ed7')),
                      }}
                    >
                      {matchingCountLoading ? '...' : (matchingCount ?? 0)}
                    </span>{' '}
                    B2B objects with email for the selected filters
                  </h4>

                  {matchingCountError && (
                    <div style={{ color: '#dc3545', fontSize: '14px', marginBottom: '8px' }}>
                      {matchingCountError}
                    </div>
                  )}

                  {objectsError && (
                    <div style={{ color: '#dc3545', fontSize: '14px', marginBottom: '8px' }}>
                      {objectsError}
                    </div>
                  )}

                  {objects.length > 0 && (
                    <div className="objects-box">
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 10px',
                          borderBottom: '1px solid #eee',
                          fontWeight: 500,
                        }}
                      >
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={allObjectsSelected}
                            onChange={(e) => handleToggleAllObjects(e.target.checked)}
                            style={{ width: '16px', height: '16px' }}
                          />
                          Select all objects
                        </label>
                      </div>
                      {objects.map((obj) => (
                        <div
                          key={obj.place_id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                            padding: '8px 10px',
                            borderBottom: '1px solid #eee',
                          }}
                        >
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              cursor: 'pointer',
                              flex: 1,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={!!selectedObjects[obj.place_id]}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSelectedObjects(prev => ({ ...prev, [obj.place_id]: checked }));
                              }}
                              style={{ width: '16px', height: '16px' }}
                            />
                            <span>
                              {obj.name || obj.place_id}
                              {obj.email ? <span style={{ color: '#6c757d' }}> ({obj.email})</span> : null}
                            </span>
                          </label>

                          <button
                            type="button"
                            className="delete-btn"
                            style={{ marginLeft: '8px', whiteSpace: 'nowrap' }}
                            onClick={() => setObjectToDelete(obj)}
                            disabled={deletingPlaceId === obj.place_id}
                          >
                            {deletingPlaceId === obj.place_id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      ))}
                    </div>
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
                setSingleReplyOnly(false);
                setValue('single_reply_only', false);
              }
            }}
          />

          {autoAnswering && (
            <>
              <ToggleField
                label="Only one answer"
                name="single_reply_only"
                checked={singleReplyOnly}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSingleReplyOnly(checked);
                  setValue('single_reply_only', checked);
                }}
              />

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
            </>
          )}
        </div>

        {/* Mailer Agent */}
        <div className="form-section">
          <h3>Mailer Agent</h3>

          <div className="form-group">
            <label htmlFor="mailer_agent_mode">Generation Engine</label>
            <select
              id="mailer_agent_mode"
              className="form-control"
              value={mailerAgentMode || 'legacy_assistant'}
              onChange={(e) => setMailerAgentMode(e.target.value as CampaignSetupRequest['mailer_agent_mode'])}
            >
              <option value="responses">Responses Agent</option>
              <option value="legacy_assistant">Legacy Assistant</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          <ToggleField
            label="Save generated emails as drafts"
            name="mailer_agent_draft_only"
            checked={mailerAgentDraftMode !== 'trusted_auto'}
            onChange={(e) => {
              setMailerAgentDraftMode(e.target.checked ? 'draft_only' : 'trusted_auto');
            }}
            hint="Draft mode is safer. Turning this off approves agent drafts into the existing sending flow."
          />

          <ToggleField
            label="Use website context"
            name="mailer_agent_website_context_enabled"
            checked={mailerAgentWebsiteContextEnabled}
            onChange={(e) => setMailerAgentWebsiteContextEnabled(e.target.checked)}
            hint="Mailer Agent will fetch recipient websites on demand when a website URL is available."
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label htmlFor="generation_model">Generation Model</label>
              <input
                id="generation_model"
                type="text"
                className="form-control"
                value={mailerAgentConfig.generation_model || ''}
                onChange={(e) => updateMailerAgentConfig('generation_model', e.target.value)}
                placeholder="gpt-5.4-mini"
              />
            </div>
            <div className="form-group">
              <label htmlFor="classifier_model">Classifier Model</label>
              <input
                id="classifier_model"
                type="text"
                className="form-control"
                value={mailerAgentConfig.classifier_model || ''}
                onChange={(e) => updateMailerAgentConfig('classifier_model', e.target.value)}
                placeholder="gpt-5.4-nano"
              />
            </div>
            <div className="form-group">
              <label htmlFor="reviewer_model">Reviewer Model</label>
              <input
                id="reviewer_model"
                type="text"
                className="form-control"
                value={mailerAgentConfig.reviewer_model || ''}
                onChange={(e) => updateMailerAgentConfig('reviewer_model', e.target.value)}
                placeholder="gpt-5.4-nano"
              />
            </div>
          </div>
        </div>

        {/* Content Direction */}
        <div className="form-section">
          <h3>Content Direction</h3>

          <TextareaField
            label="Company / Platform Context"
            name="company_context"
            value={mailerAgentConfig.company_context || ''}
            onChange={(e) => updateMailerAgentConfig('company_context', e.target.value)}
            rows={4}
            placeholder="What the platform/company does, why recipients may care..."
          />

          <TextareaField
            label="Offer Context"
            name="offer_context"
            value={mailerAgentConfig.offer_context || ''}
            onChange={(e) => updateMailerAgentConfig('offer_context', e.target.value)}
            rows={4}
            placeholder="What exactly should be offered or suggested..."
          />

          <TextareaField
            label="Target Audience"
            name="target_audience"
            value={mailerAgentConfig.target_audience || ''}
            onChange={(e) => updateMailerAgentConfig('target_audience', e.target.value)}
            rows={3}
            placeholder="Who these recipients are and what matters to them..."
          />

          <TextareaField
            label="First Contact Instructions"
            name="first_contact_instruction"
            value={mailerAgentConfig.first_contact_instruction || ''}
            onChange={(e) => updateMailerAgentConfig('first_contact_instruction', e.target.value)}
            required={mailerAgentMode === 'responses'}
            rows={4}
            placeholder="How first-contact emails should be written..."
          />

          <TextareaField
            label="Reply Instructions"
            name="reply_instruction"
            value={mailerAgentConfig.reply_instruction || ''}
            onChange={(e) => updateMailerAgentConfig('reply_instruction', e.target.value)}
            rows={4}
            placeholder="How the agent should answer inbound replies..."
          />

          <TextareaField
            label="CTA Instruction"
            name="cta_instruction"
            value={mailerAgentConfig.cta_instruction || ''}
            onChange={(e) => updateMailerAgentConfig('cta_instruction', e.target.value)}
            rows={2}
            placeholder="What one soft call to action should be used..."
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label htmlFor="personalization_level">Personalization Level</label>
              <select
                id="personalization_level"
                className="form-control"
                value={mailerAgentConfig.personalization_level || 'medium'}
                onChange={(e) => updateMailerAgentConfig('personalization_level', e.target.value as MailerAgentConfig['personalization_level'])}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="max_body_chars">Max Body Length</label>
              <input
                id="max_body_chars"
                type="number"
                min={300}
                max={2000}
                className="form-control"
                value={mailerAgentConfig.max_body_chars || 1200}
                onChange={(e) => updateMailerAgentConfig('max_body_chars', Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="max_subject_chars">Max Subject Length</label>
              <input
                id="max_subject_chars"
                type="number"
                min={40}
                max={180}
                className="form-control"
                value={mailerAgentConfig.max_subject_chars || 120}
                onChange={(e) => updateMailerAgentConfig('max_subject_chars', Number(e.target.value))}
              />
            </div>
          </div>

          <TextareaField
            label="Required Points"
            name="required_points"
            value={listToText(mailerAgentConfig.required_points)}
            onChange={(e) => updateMailerAgentConfig('required_points', textToList(e.target.value))}
            rows={3}
            placeholder="One required point per line..."
          />

          <TextareaField
            label="Forbidden Phrases"
            name="forbidden_phrases"
            value={listToText(mailerAgentConfig.forbidden_phrases)}
            onChange={(e) => updateMailerAgentConfig('forbidden_phrases', textToList(e.target.value))}
            rows={3}
            placeholder="One forbidden phrase per line..."
          />

          <TextareaField
            label="Quality Review Instructions"
            name="quality_review_instruction"
            value={mailerAgentConfig.quality_review_instruction || ''}
            onChange={(e) => updateMailerAgentConfig('quality_review_instruction', e.target.value)}
            rows={3}
            placeholder="Extra quality checks the reviewer should apply..."
          />
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
            onChange={(e) => {
              const checked = e.target.checked;
              setUseCorporate(checked);
              setValue('use_corporate', checked);
            }}
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
            {recipientMode === 'emails' && (
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Timezone (+2 or -2)"
                  {...register('timezone')}
                />
              </div>
            )}
          </div>

          <div style={{ marginTop: '20px' }}>
            <h4>Sender Accounts</h4>
            {senderAccountsLoading && (
              <div style={{ color: '#0d6efd', fontSize: '14px' }}>Loading sender accounts...</div>
            )}
            {senderAccountsError && (
              <div style={{ color: '#dc3545', fontSize: '14px' }}>{senderAccountsError}</div>
            )}
            {!senderAccountsLoading && !senderAccountsError && (
              <div>
                {filteredSenderAccounts.length === 0 ? (
                  <div style={{ color: '#dc3545', fontSize: '14px' }}>
                    No {useCorporate ? 'corporate' : 'personal'} sender accounts available. Add sender accounts first.
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '12px',
                      borderRadius: '6px',
                      backgroundColor: '#f8f9fa',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        marginBottom: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={allSenderAccountsSelected}
                        onChange={(e) => handleToggleAllSenderAccounts(e.target.checked)}
                        style={{ width: '16px', height: '16px' }}
                      />
                      Select all sender accounts
                    </label>
                    {filteredSenderAccounts.map((acc) => (
                        <label
                          key={acc.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#212529',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedSenderIds.includes(acc.id)}
                            onChange={(e) => handleSenderSelectionChange(acc.id, e.target.checked)}
                            style={{ width: '16px', height: '16px' }}
                          />
                          <span>
                            {acc.email}
                            {acc.first_name || acc.last_name ? (
                              <span style={{ color: '#6c757d', fontWeight: 400 }}>
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
              {mailerAgentMode === 'responses' && mailerAgentDraftMode === 'trusted_auto' && (
                <div className="warning-alert">
                  <strong>Trusted auto mode:</strong> Mailer Agent drafts will be approved into the sending flow automatically.
                </div>
              )}
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

    {objectToDelete && (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3>Delete B2B object</h3>
          <p>
            Are you sure you want to delete object{' '}
            <strong>
              {objectToDelete?.name || objectToDelete?.place_id}
              {objectToDelete?.email ? ` (${objectToDelete.email})` : ''}
            </strong>
            ? This action cannot be undone.
          </p>
          <div className="modal-buttons">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setObjectToDelete(null)}
              disabled={Boolean(deletingPlaceId)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="delete-btn"
              onClick={handleDeleteObject}
              disabled={Boolean(deletingPlaceId)}
            >
              {deletingPlaceId ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};
