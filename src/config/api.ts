// API Configuration
// You can easily change the base URL here
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000';

// API endpoints
export const API_ENDPOINTS = {
  checkPassword: '/api/auth/check-password',
  emailsSetup: '/api/emails/setup',
  campaigns: '/api/campaigns',
  campaignStatus: (campaignId: string) => `/api/campaigns/${campaignId}`,
  campaignObjectDetails: (campaignId: string, objectId: string) => `/api/campaigns/${campaignId}/objects/${objectId}`,
  emailThread: (campaignId: string, threadId: string) => `/api/campaigns/${campaignId}/threads/${threadId}`,
  sendReply: (campaignId: string, objectId: string) => `/api/campaigns/${campaignId}/objects/${objectId}/reply`,
  campaignPause: (campaignId: string) => `/api/campaigns/${campaignId}/pause`,
  campaignResume: (campaignId: string) => `/api/campaigns/${campaignId}/resume`,
  b2bStats: '/api/b2b/stats/',
  b2bImport: '/api/b2b/import',
  senderAccounts: '/api/sender-accounts',
  mailApiUrls: '/api/mail-api-urls',
  b2bCount: (country: string, objectType: string) => {
    const params = new URLSearchParams({
      country,
      object_type: objectType,
      has_email: 'true',
    });
    return `/api/b2b/count/?${params.toString()}`;
  },
};

// Helper function to build full URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

