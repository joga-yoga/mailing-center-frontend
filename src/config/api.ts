// API Configuration
// You can easily change the base URL here
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000';

// API endpoints
export const API_ENDPOINTS = {
  emailsSetup: '/api/emails/setup',
  campaigns: '/api/campaigns',
  campaignStatus: (campaignId: string) => `/api/campaigns/${campaignId}`,
  campaignPause: (campaignId: string) => `/api/campaigns/${campaignId}/pause`,
  campaignResume: (campaignId: string) => `/api/campaigns/${campaignId}/resume`,
};

// Helper function to build full URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

