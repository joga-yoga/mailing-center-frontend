// Authentication utilities

const AUTH_TOKEN_KEY = 'auth_token';

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  const token = getToken();
  if (!token) {
    return false;
  }
  
  // Check if token is expired
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp;
    if (exp && Date.now() >= exp * 1000) {
      clearAuthentication();
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

/**
 * Get authentication token
 */
export const getToken = (): string | null => {
  return sessionStorage.getItem(AUTH_TOKEN_KEY);
};

/**
 * Set authentication token
 */
export const setToken = (token: string): void => {
  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
};

/**
 * Clear authentication
 */
export const clearAuthentication = (): void => {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
};






