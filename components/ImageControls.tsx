import React from 'react';
import { ImageFilters } from '../types';
import { IconAdjustments, IconRefresh } from './Icons';

interface ImageControlsProps {
  filters: ImageFilters;
  onChange: (filters: ImageFilters) => void;
  disabled: boolean;
}

const ImageControls: React.FC<ImageControlsProps> = ({ filters, onChange, disabled }) => {
  const handleChange = (key: keyof ImageFilters, value: number) => {
    onChange({ ...filters, [key]: value });
  };

  const handleReset = () => {
    onChange({ contrast: 100, brightness: 100, grayscale: 0 });
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex flex-col space-y-4 shadow-sm transition-all">
      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
        <div className="flex items-center space-x-2 text-gray-300">
          <IconAdjustments />
          <span className="text-xs font-bold uppercase tracking-widest">Pre-processing</span>
        </div>
        <button 
          onClick={handleReset}
          disabled={disabled}
          className="p-1.5 text-gray-500 hover:text-emerald-400 hover:bg-gray-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Reset Filters"
        >
          <IconRefresh />
        </button>
      </div>

      <div className="space-y-3">
        {/* Contrast */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] uppercase text-gray-500 font-medium">
            <span>Contrast</span>
            <span>{filters.contrast}%</span>
          </div>
          <input
            type="range"
            min="50"
            max="200"
            value={filters.contrast}
            disabled={disabled}
            onChange={(e) => handleChange('contrast', Number(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
          />
        </div>

        {/* Brightness */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] uppercase text-gray-500 font-medium">
            <span>Brightness</span>
            <span>{filters.brightness}%</span>
          </div>
          <input
            type="range"
            min="50"
            max="200"
            value={filters.brightness}
            disabled={disabled}
            onChange={(e) => handleChange('brightness', Number(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
          />
        </div>

        {/* Grayscale */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] uppercase text-gray-500 font-medium">
            <span>Grayscale</span>
            <span>{filters.grayscale}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={filters.grayscale}
            disabled={disabled}
            onChange={(e) => handleChange('grayscale', Number(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  );
};

export default ImageControls;