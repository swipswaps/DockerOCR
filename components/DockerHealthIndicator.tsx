import React, { useEffect, useState } from 'react';
import { dockerHealthService, DockerHealthStatus } from '../services/dockerHealthService';

interface DockerHealthIndicatorProps {
  onStatusChange?: (isHealthy: boolean) => void;
}

export const DockerHealthIndicator: React.FC<DockerHealthIndicatorProps> = ({ onStatusChange }) => {
  const [status, setStatus] = useState<DockerHealthStatus | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Start monitoring
    dockerHealthService.startMonitoring({
      onHealthy: () => {
        const newStatus = dockerHealthService.getStatus();
        setStatus(newStatus);
        onStatusChange?.(true);
        setIsRetrying(false);
      },
      onUnhealthy: (unhealthyStatus) => {
        setStatus(unhealthyStatus);
        onStatusChange?.(false);
        setShowDetails(true);
        setIsRetrying(false);
      },
      onRecovered: () => {
        const newStatus = dockerHealthService.getStatus();
        setStatus(newStatus);
        onStatusChange?.(true);
        setShowDetails(false);
        setIsRetrying(false);
      },
    });

    // Initial check
    dockerHealthService.forceCheck();

    return () => {
      dockerHealthService.stopMonitoring();
    };
  }, [onStatusChange]);

  const handleRetry = async () => {
    setIsRetrying(true);
    await dockerHealthService.forceCheck();
  };

  if (!status) {
    return (
      <div className="docker-health-indicator checking">
        <span className="status-icon">🔄</span>
        <span className="status-text">Checking Docker...</span>
      </div>
    );
  }

  if (status.isHealthy) {
    return (
      <div className="docker-health-indicator healthy">
        <span className="status-icon">✅</span>
        <span className="status-text">PaddleOCR Ready</span>
      </div>
    );
  }

  return (
    <div className="docker-health-indicator unhealthy">
      <div className="status-header" onClick={() => setShowDetails(!showDetails)}>
        <span className="status-icon">⚠️</span>
        <span className="status-text">Docker Unavailable</span>
        <span className="expand-icon">{showDetails ? '▼' : '▶'}</span>
      </div>

      {showDetails && (
        <div className="status-details">
          <p className="error-message">
            {status.error || 'Cannot connect to PaddleOCR Docker container'}
          </p>

          <div className="recovery-actions">
            <h4>🔧 Auto-Recovery Options:</h4>

            <button className="action-button retry" onClick={handleRetry} disabled={isRetrying}>
              {isRetrying ? '🔄 Retrying...' : '🔄 Retry Connection'}
            </button>

            <div className="fallback-info">
              <p>
                🐳 <strong>PaddleOCR Requires Docker:</strong>
              </p>
              <p>
                Start Docker with: <code>docker compose up -d</code>
              </p>
              <p>Or switch to Gemini API (requires API key) in the engine selector above.</p>
            </div>

            <div className="localhost-suggestion">
              <p>
                💡 <strong>Using GitHub Pages?</strong>
              </p>
              <p>For full PaddleOCR functionality with Docker:</p>
              <a
                href="http://localhost:3000"
                target="_blank"
                rel="noopener noreferrer"
                className="localhost-link"
              >
                Open Local Version (localhost:3000)
              </a>
              <p style={{ fontSize: '11px', marginTop: '8px', color: '#9ca3af' }}>
                The local version can connect to your Docker instance.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
