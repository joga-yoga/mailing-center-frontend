// Authentication utilities

const AUTH_SESSION_KEY = 'site_authenticated';

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return sessionStorage.getItem(AUTH_SESSION_KEY) === 'true';
};

/**
 * Set authentication status
 */
export const setAuthenticated = (authenticated: boolean): void => {
  if (authenticated) {
    sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
  } else {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
  }
};

/**
 * Clear authentication
 */
export const clearAuthentication = (): void => {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
};






