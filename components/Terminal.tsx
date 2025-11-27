import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface TerminalProps {
  logs: LogEntry[];
}

const Terminal: React.FC<TerminalProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-[#0e121a] border border-gray-800 rounded-lg overflow-hidden shadow-xl font-mono text-sm max-w-full">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 overflow-hidden">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full flex-shrink-0"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
          <span className="ml-2 text-xs text-gray-400 truncate">
            root@docker-container:/app/ocr
          </span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto overflow-x-hidden space-y-1 text-gray-300 max-w-full"
      >
        {logs.length === 0 && (
          <div className="text-gray-600 italic">Waiting for input stream...</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex space-x-2 max-w-full overflow-hidden">
            <span className="text-gray-500 select-none flex-shrink-0">[{log.timestamp}]</span>
            <span
              className={`font-bold flex-shrink-0 ${
                log.level === 'ERROR'
                  ? 'text-red-400'
                  : log.level === 'SUCCESS'
                    ? 'text-emerald-400'
                    : log.level === 'WARN'
                      ? 'text-yellow-400'
                      : 'text-blue-400'
              }`}
            >
              {log.level}
            </span>
            <span className="text-gray-200 whitespace-pre-wrap break-words min-w-0 flex-1">
              {log.message}
            </span>
          </div>
        ))}
        {/* Cursor */}
        <div className="animate-pulse mt-1 text-emerald-500">_</div>
      </div>
    </div>
  );
};

export default Terminal;
