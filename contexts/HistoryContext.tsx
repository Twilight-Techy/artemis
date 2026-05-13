import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { artemisApi } from '../api/artemisClient';
import { useAuth } from './AuthContext';

type HistoryLog = any;

type HistoryContextType = {
  logs: HistoryLog[];
  isLoading: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  clearLogs: () => void;
};

const HistoryContext = createContext<HistoryContextType>({
  logs: [],
  isLoading: true,
  isRefreshing: false,
  refresh: async () => {},
  clearLogs: () => {},
});

export const useHistory = () => useContext(HistoryContext);

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchLogs = useCallback(async (isPullRefresh = false) => {
    if (isPullRefresh) {
      setIsRefreshing(true);
    }
    try {
      const data = await artemisApi.getHistory();
      setLogs(data);
      setHasFetched(true);
    } catch (e) {
      console.warn('[HistoryContext] Failed to fetch history logs', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Fetch once when the token becomes available
  useEffect(() => {
    if (token && !hasFetched) {
      fetchLogs();
    }
    if (!token) {
      setLogs([]);
      setHasFetched(false);
      setIsLoading(true);
    }
  }, [token, hasFetched, fetchLogs]);

  const refresh = useCallback(async () => {
    await fetchLogs(true);
  }, [fetchLogs]);

  // Called immediately after a local clear so the screen updates without a refetch
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return (
    <HistoryContext.Provider value={{ logs, isLoading, isRefreshing, refresh, clearLogs }}>
      {children}
    </HistoryContext.Provider>
  );
};
