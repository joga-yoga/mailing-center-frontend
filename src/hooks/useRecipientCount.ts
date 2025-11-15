// Custom hook for fetching recipient count
import { useState, useEffect } from 'react';
import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api';

export function useRecipientCount(
  enabled: boolean,
  country: string | undefined,
  objectType: string | undefined
) {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!enabled || !country || !objectType) {
      setCount(null);
      setError('');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    const fetchCount = async () => {
      try {
        // TypeScript knows these are defined due to the check above
        const data = await apiClient.get<{ count: number }>(
          API_ENDPOINTS.b2bCount(country!, objectType!)
        );
        if (!cancelled) {
          setCount(typeof data.count === 'number' ? data.count : 0);
        }
      } catch (err) {
        if (!cancelled) {
          setCount(null);
          setError(err instanceof Error ? err.message : 'Failed to load count');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchCount();

    return () => {
      cancelled = true;
    };
  }, [enabled, country, objectType]);

  return { count, loading, error };
}

