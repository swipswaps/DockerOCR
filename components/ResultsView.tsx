import React, { useState } from 'react';
import { OCRResult } from '../types';
import { IconCopy } from './Icons';

interface ResultsViewProps {
  data: OCRResult | null;
}

const ResultsView: React.FC<ResultsViewProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'json' | 'text'>('json');

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-gray-900 rounded-lg border border-gray-800 border-dashed">
        <p className="mb-2">No data extracted yet</p>
        <p className="text-xs text-gray-600">Upload an image to begin analysis</p>
      </div>
    );
  }

  const handleCopy = () => {
    const content = activeTab === 'json' 
      ? JSON.stringify(data, null, 2) 
      : data.text;
    navigator.clipboard.writeText(content);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-850 border-b border-gray-800">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('json')}
            className={`text-xs font-mono uppercase tracking-wider py-1 border-b-2 transition-colors ${
              activeTab === 'json' 
                ? 'border-emerald-500 text-emerald-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            JSON Output
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`text-xs font-mono uppercase tracking-wider py-1 border-b-2 transition-colors ${
              activeTab === 'text' 
                ? 'border-emerald-500 text-emerald-400' 
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Raw Text
          </button>
        </div>
        <button 
          onClick={handleCopy}
          className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400"
          title="Copy to Clipboard"
        >
          <IconCopy />
        </button>
      </div>

      <div className="relative flex-1 overflow-auto p-4 bg-[#0B0F19]">
        {activeTab === 'json' ? (
          <pre className="font-mono text-xs text-emerald-300/90 whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : (
          <div className="font-mono text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
            {data.text}
          </div>
        )}
      </div>
      
      <div className="bg-gray-850 px-4 py-1 border-t border-gray-800 flex justify-between text-[10px] uppercase tracking-wider text-gray-500">
        <span>Blocks: {data.blocks.length}</span>
        <span>Confidence: {(data.blocks.reduce((acc, b) => acc + b.confidence, 0) / (data.blocks.length || 1) * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
};

export default ResultsView;