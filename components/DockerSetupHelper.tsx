import React, { useState, useEffect } from 'react';
import {
  checkContainerHealth,
  getSetupInstructions,
  attemptAutoStart,
  DockerStatus,
} from '../services/dockerService';

interface DockerSetupHelperProps {
  onClose: () => void;
  onRetry: () => void;
}

const DockerSetupHelper: React.FC<DockerSetupHelperProps> = ({ onClose, onRetry }) => {
  const [status, setStatus] = useState<DockerStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [autoStarting, setAutoStarting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const { platform, instructions } = getSetupInstructions();

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  };

  const checkStatus = async () => {
    setChecking(true);
    addLog('Checking PaddleOCR container status...');
    const dockerStatus = await checkContainerHealth();
    setStatus(dockerStatus);
    addLog(dockerStatus.message);
    setChecking(false);
  };

  useEffect(() => {
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAutoStart = async () => {
    setAutoStarting(true);
    const success = await attemptAutoStart(addLog);
    setAutoStarting(false);

    if (success) {
      addLog('✅ Container started successfully!');
      setTimeout(() => {
        onRetry();
        onClose();
      }, 2000);
    } else {
      await checkStatus();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addLog('📋 Copied to clipboard');
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">🐳 PaddleOCR Docker Setup</h2>
            <p className="text-sm text-gray-400 mt-1">Platform: {platform}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Status */}
        <div className="p-4 border-b border-gray-800">
          <div className="bg-gray-800 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">Container Status</span>
              <button
                onClick={checkStatus}
                disabled={checking}
                className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
              >
                {checking ? 'Checking...' : 'Refresh'}
              </button>
            </div>
            {status && (
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Health:</span>
                  <span className={status.containerHealthy ? 'text-green-400' : 'text-red-400'}>
                    {status.containerHealthy ? '✅ Healthy' : '❌ Not Running'}
                  </span>
                </div>
                <div className="mt-2 text-gray-300">{status.message}</div>
              </div>
            )}
          </div>
        </div>

        {/* Auto-Start Section */}
        {status && !status.containerHealthy && status.canAutoFix && (
          <div className="p-4 border-b border-gray-800">
            <div className="bg-blue-900/20 border border-blue-700/50 rounded p-4">
              <h3 className="text-sm font-medium text-blue-300 mb-2">🔧 Auto-Start Available</h3>
              <p className="text-sm text-gray-300 mb-3">
                The app can attempt to wait for the container to start automatically. This works if
                you&apos;ve already run{' '}
                <code className="bg-gray-800 px-1 rounded">docker compose up -d</code> in another
                terminal.
              </p>
              <button
                onClick={handleAutoStart}
                disabled={autoStarting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm font-medium disabled:opacity-50"
              >
                {autoStarting ? '⏳ Waiting for container...' : '🚀 Wait for Container'}
              </button>
            </div>
          </div>
        )}

        {/* Manual Setup Instructions */}
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-sm font-medium text-white mb-3">📋 Manual Setup Instructions</h3>
          <div className="bg-gray-800 rounded p-4 font-mono text-xs space-y-2">
            {instructions.map((line, idx) => (
              <div
                key={idx}
                className={line.startsWith('   ') ? 'text-emerald-400 ml-4' : 'text-gray-300'}
              >
                {line}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => copyToClipboard('docker compose up -d')}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white"
            >
              📋 Copy Command
            </button>
            <button
              onClick={() => window.open('https://docs.docker.com/get-docker/', '_blank')}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white"
            >
              📖 Install Docker
            </button>
          </div>
        </div>

        {/* Logs */}
        {logs.length > 0 && (
          <div className="p-4">
            <h3 className="text-sm font-medium text-white mb-2">📝 Activity Log</h3>
            <div className="bg-black rounded p-3 font-mono text-xs space-y-1 max-h-40 overflow-y-auto">
              {logs.map((log, idx) => (
                <div key={idx} className="text-gray-300">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 p-4 flex justify-between items-center">
          <div className="text-xs text-gray-400">
            💡 Tip: PaddleOCR runs locally for privacy. Gemini uses cloud API.
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm"
            >
              Close
            </button>
            <button
              onClick={() => {
                onRetry();
                onClose();
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-white text-sm font-medium"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DockerSetupHelper;
