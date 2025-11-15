// Unified API Client with error handling and request cancellation
import React from 'react';
import { buildApiUrl } from '../config/api';
import { getToken, clearAuthentication } from './auth';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RequestOptions extends Omit<RequestInit, 'signal'> {
  timeout?: number;
}

class ApiClient {
  private activeRequests = new Map<string, AbortController>();

  /**
   * Unified fetch with error handling and abort support
   */
  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { timeout = 30000, ...fetchOptions } = options;
    const url = buildApiUrl(endpoint);
    
    // Add authentication token to headers
    const token = getToken();
    const headers: Record<string, string> = {
      ...(fetchOptions.headers as Record<string, string> || {}),
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Create abort controller for this request
    const abortController = new AbortController();
    const requestId = `${options.method || 'GET'}-${endpoint}-${Date.now()}`;
    this.activeRequests.set(requestId, abortController);

    // Setup timeout
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);
      this.activeRequests.delete(requestId);

      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        let errorDetails: any = undefined;

        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
          errorDetails = errorData;
        } catch {
          // Response body is not JSON or empty
        }

        // If unauthorized, clear token and redirect to login
        if (response.status === 401) {
          clearAuthentication();
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }

        throw new ApiError(errorMessage, response.status, errorDetails);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      }

      return {} as T;
    } catch (error) {
      clearTimeout(timeoutId);
      this.activeRequests.delete(requestId);

      if (error instanceof ApiError) {
        throw error;
      }

      if ((error as any).name === 'AbortError') {
        throw new ApiError('Request was cancelled');
      }

      throw new ApiError(
        error instanceof Error ? error.message : 'Network error occurred'
      );
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<T> {
    const isFormData = data instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      headers: isFormData ? options?.headers : {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    });
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<T> {
    const isFormData = data instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      headers: isFormData ? options?.headers : {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * Cancel all active requests
   */
  cancelAll(): void {
    this.activeRequests.forEach((controller) => controller.abort());
    this.activeRequests.clear();
  }

  /**
   * Cancel specific request by ID pattern
   */
  cancelByPattern(pattern: string): void {
    const keysToCancel: string[] = [];
    this.activeRequests.forEach((controller, key) => {
      if (key.includes(pattern)) {
        controller.abort();
        keysToCancel.push(key);
      }
    });
    keysToCancel.forEach((key) => this.activeRequests.delete(key));
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Custom hook for React components
export function useApiClient() {
  const clientRef = React.useRef(new ApiClient());

  React.useEffect(() => {
    const client = clientRef.current;
    return () => {
      // Cancel all requests when component unmounts
      client.cancelAll();
    };
  }, []);

  return clientRef.current;
}

