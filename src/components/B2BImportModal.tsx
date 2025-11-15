import React, { useState } from 'react';
import { buildApiUrl } from '../config/api';
import { API_ENDPOINTS } from '../config/api';
import './B2BImportModal.css';

interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  validation_errors: string[];
}

interface B2BImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const B2BImportModal: React.FC<B2BImportModalProps> = ({ isOpen, onClose }) => {
  const [password, setPassword] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.name.endsWith('.json')) {
        setError('File must be in JSON format');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      setError('Please enter password');
      return;
    }

    if (!file) {
      setError('Please select a JSON file');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('password', password);
      formData.append('file', file);
      formData.append('update_existing', updateExisting.toString());

      const response = await fetch(buildApiUrl(API_ENDPOINTS.b2bImport), {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Import error');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import data');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setFile(null);
    setUpdateExisting(true);
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import B2B Objects</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit} className="import-form">
            <div className="form-group">
              <label htmlFor="password">Password:</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="file">JSON File:</label>
              <input
                type="file"
                id="file"
                accept=".json"
                onChange={handleFileChange}
                disabled={loading}
              />
              {file && (
                <div className="file-info">
                  Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                  disabled={loading}
                />
                Update existing objects
              </label>
            </div>

            {error && (
              <div className="error-message">{error}</div>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="button button-primary"
                disabled={loading || !password || !file}
              >
                {loading ? 'Importing...' : 'Import'}
              </button>
            </div>
          </form>
        ) : (
          <div className="import-results">
            <h3>Import Results</h3>
            
            <div className="results-summary">
              <div className="result-item result-total">
                <span className="result-label">Total Objects:</span>
                <span className="result-value">{result.total}</span>
              </div>
              <div className="result-item result-created">
                <span className="result-label">Created:</span>
                <span className="result-value">{result.created}</span>
              </div>
              <div className="result-item result-updated">
                <span className="result-label">Updated:</span>
                <span className="result-value">{result.updated}</span>
              </div>
              <div className="result-item result-skipped">
                <span className="result-label">Skipped:</span>
                <span className="result-value">{result.skipped}</span>
              </div>
              <div className="result-item result-errors">
                <span className="result-label">Errors:</span>
                <span className="result-value">{result.errors}</span>
              </div>
            </div>

            {result.validation_errors.length > 0 && (
              <div className="validation-errors">
                <h4>Validation Errors:</h4>
                <div className="errors-list">
                  {result.validation_errors.map((error, index) => (
                    <div key={index} className="error-item">{error}</div>
                  ))}
                  {result.errors > result.validation_errors.length && (
                    <div className="error-item">
                      ... and {result.errors - result.validation_errors.length} more errors
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={handleClose}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

