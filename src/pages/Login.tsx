import React, { useState } from 'react';
import { API_ENDPOINTS } from '../config/api';
import { apiClient } from '../utils/apiClient';
import { setToken } from '../utils/auth';
import './Login.css';

export const LoginPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiClient.post<{ 
        success: boolean; 
        message?: string;
        access_token?: string;
        token_type?: string;
      }>(
        API_ENDPOINTS.checkPassword,
        { password }
      );

      if (data.success && data.access_token) {
        setToken(data.access_token);
        // Reload page to access protected routes
        window.location.href = '/';
      } else {
        setError(data.message || 'Incorrect password');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">Email Campaign Center</h1>
        <p className="login-subtitle">Please enter the password to continue</p>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="Enter password"
              autoFocus
              disabled={loading}
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading || !password.trim()}
          >
            {loading ? 'Checking...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
};






