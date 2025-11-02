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
};

// Helper function to build full URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

