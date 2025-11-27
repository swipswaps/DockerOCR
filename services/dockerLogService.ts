/**
 * Docker Log Service
 * Polls PaddleOCR container logs and streams them to the frontend
 */

export interface DockerLog {
  timestamp: string;
  level: string;
  message: string;
}

export interface DockerLogsResponse {
  logs: DockerLog[];
  count: number;
}

/**
 * Fetch recent logs from PaddleOCR container
 */
export const fetchDockerLogs = async (): Promise<DockerLog[]> => {
  try {
    const response = await fetch('http://localhost:5000/logs', {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      console.warn('Failed to fetch Docker logs:', response.statusText);
      return [];
    }

    const data: DockerLogsResponse = await response.json();
    return data.logs || [];
  } catch (error) {
    console.warn('Error fetching Docker logs:', error);
    return [];
  }
};

/**
 * Poll Docker logs at regular intervals
 * Returns a cleanup function to stop polling
 */
export const pollDockerLogs = (
  onNewLogs: (logs: DockerLog[]) => void,
  intervalMs: number = 2000
): (() => void) => {
  let lastLogCount = 0;

  const poll = async () => {
    const logs = await fetchDockerLogs();

    // Only call callback if we have new logs
    if (logs.length > lastLogCount) {
      const newLogs = logs.slice(lastLogCount);
      onNewLogs(newLogs);
      lastLogCount = logs.length;
    }
  };

  // Start polling
  const intervalId = setInterval(poll, intervalMs);

  // Initial fetch
  poll();

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
  };
};

/**
 * Get logs since a specific timestamp
 */
export const getLogsSince = async (since: string): Promise<DockerLog[]> => {
  const allLogs = await fetchDockerLogs();
  return allLogs.filter((log) => log.timestamp > since);
};

/**
 * Format a Docker log entry for display
 */
export const formatDockerLog = (log: DockerLog): string => {
  const time = new Date(log.timestamp).toLocaleTimeString();
  const emoji = getLogEmoji(log.level, log.message);
  return `[${time}] ${emoji} ${log.message}`;
};

/**
 * Get emoji for log level
 */
const getLogEmoji = (level: string, message: string): string => {
  // Check message content first
  if (message.includes('✅') || message.includes('🚀') || message.includes('📥')) {
    return ''; // Message already has emoji
  }

  // Fallback to level-based emoji
  switch (level.toUpperCase()) {
    case 'ERROR':
      return '❌';
    case 'WARNING':
    case 'WARN':
      return '⚠️';
    case 'INFO':
      return 'ℹ️';
    case 'DEBUG':
      return '🔍';
    default:
      return '📝';
  }
};

/**
 * Check if a log entry indicates an error
 */
export const isErrorLog = (log: DockerLog): boolean => {
  return (
    log.level.toUpperCase() === 'ERROR' ||
    log.message.toLowerCase().includes('error') ||
    log.message.toLowerCase().includes('failed')
  );
};

/**
 * Check if a log entry indicates success
 */
export const isSuccessLog = (log: DockerLog): boolean => {
  return (
    log.message.includes('✅') ||
    log.message.toLowerCase().includes('success') ||
    log.message.toLowerCase().includes('complete')
  );
};

/**
 * Extract progress information from logs
 */
export const extractProgress = (
  logs: DockerLog[]
): {
  stage: string;
  percentage: number;
} | null => {
  // Look for specific progress indicators
  const recentLogs = logs.slice(-10);

  for (const log of recentLogs.reverse()) {
    if (log.message.includes('Loading PP-OCRv4')) {
      return { stage: 'Loading detection model', percentage: 25 };
    }
    if (log.message.includes('Running classification')) {
      return { stage: 'Running classification', percentage: 50 };
    }
    if (log.message.includes('Processing bounding boxes')) {
      return { stage: 'Processing bounding boxes', percentage: 75 };
    }
    if (log.message.includes('extraction successful')) {
      return { stage: 'Complete', percentage: 100 };
    }
  }

  return null;
};
