// Custom hook for managing sender accounts
import { useState, useEffect } from 'react';
import { apiClient } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api';

export type SenderAccount = {
  id: string;
  email: string;
  server_id: string;
  first_name?: string | null;
  last_name?: string | null;
  is_active: boolean;
};

export function useSenderAccounts(useCorporate: boolean) {
  const [accounts, setAccounts] = useState<SenderAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fetch accounts on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiClient.get<SenderAccount[]>(
          `${API_ENDPOINTS.senderAccounts}?active_only=true`
        );
        setAccounts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sender accounts');
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  // Auto-select accounts based on server type
  useEffect(() => {
    if (!accounts.length) {
      setSelectedIds([]);
      return;
    }

    const serverId = useCorporate ? '2' : '1';
    const filtered = accounts.filter((acc) => acc.server_id === serverId);
    setSelectedIds(filtered.map((acc) => acc.id));
  }, [useCorporate, accounts]);

  // Get filtered accounts for current mode
  const filteredAccounts = accounts.filter(
    (acc) => acc.server_id === (useCorporate ? '2' : '1')
  );

  const toggleAccount = (accountId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) {
        return prev.includes(accountId) ? prev : [...prev, accountId];
      }
      return prev.filter((id) => id !== accountId);
    });
  };

  return {
    accounts: filteredAccounts,
    allAccounts: accounts,
    selectedIds,
    loading,
    error,
    toggleAccount,
  };
}

