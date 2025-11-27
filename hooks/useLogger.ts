import { useState, useCallback } from 'react';
import { LogEntry } from '../types';

/**
 * Custom hook for managing logs
 */
export const useLogger = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((message: string, level: LogEntry['level'] = 'INFO') => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const id = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    setLogs((prev) => [
      ...prev,
      {
        id,
        timestamp,
        level,
        message,
      },
    ]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    logs,
    addLog,
    clearLogs,
  };
};
