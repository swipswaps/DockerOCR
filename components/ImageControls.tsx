import React from 'react';
import { ImageFilters } from '../types';
import { IconAdjustments, IconRefresh, IconRotate, IconFlipH, IconFlipV, IconInvert, IconZoomIn, IconZoomOut, IconCrop } from './Icons';

interface ImageControlsProps {
  filters: ImageFilters;
  onChange: (filters: ImageFilters) => void;
  disabled: boolean;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onCrop?: () => void;
}

const ImageControls: React.FC<ImageControlsProps> = ({ filters, onChange, disabled, onZoomIn, onZoomOut, onCrop }) => {
  const handleChange = (key: keyof ImageFilters, value: number | boolean) => {
    onChange({ ...filters, [key]: value });
  };

  const handleReset = () => {
    onChange({ 
      contrast: 100, 
      brightness: 100, 
      grayscale: 0,
      rotation: 0,
      flipH: false,
      flipV: false,
      invert: false
    });
  };

  const toggleBoolean = (key: keyof ImageFilters) => {
    // @ts-ignore
    handleChange(key, !filters[key]);
  };

  const rotateRight = () => {
    const newRotation = (filters.rotation + 90) % 360;
    handleChange('rotation', newRotation);
  };
  
  const rotateLeft = () => {
    let newRotation = filters.rotation - 90;
    if (newRotation < 0) newRotation = 270;
    handleChange('rotation', newRotation);
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex flex-col space-y-5 shadow-sm transition-all h-full overflow-y-auto">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center space-x-2 text-gray-300">
          <IconAdjustments />
          <span className="text-xs font-bold uppercase tracking-widest">Image Tools</span>
        </div>
        <button 
          onClick={handleReset}
          disabled={disabled}
          className="p-1.5 text-gray-500 hover:text-emerald-400 hover:bg-gray-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Reset All Filters"
        >
          <IconRefresh />
        </button>
      </div>

      {/* Transforms Toolbar */}
      <div className="grid grid-cols-5 gap-2">
        <button onClick={rotateLeft} disabled={disabled} className="tool-btn group" title="Rotate Left">
          <div className="transform -scale-x-100"><IconRotate /></div>
        </button>
        <button onClick={rotateRight} disabled={disabled} className="tool-btn" title="Rotate Right">
          <IconRotate />
        </button>
        <button onClick={() => toggleBoolean('flipH')} disabled={disabled} className={`tool-btn ${filters.flipH ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700' : ''}`} title="Flip Horizontal">
          <IconFlipH />
        </button>
        <button onClick={() => toggleBoolean('flipV')} disabled={disabled} className={`tool-btn ${filters.flipV ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700' : ''}`} title="Flip Vertical">
          <IconFlipV />
        </button>
        <button onClick={() => toggleBoolean('invert')} disabled={disabled} className={`tool-btn ${filters.invert ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700' : ''}`} title="Invert Colors">
          <IconInvert />
        </button>
      </div>

      <div className="space-y-4 pt-2 border-t border-gray-800/50">
        {/* Contrast */}
        <div className="space-y-2">
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
            className="slider"
          />
        </div>

        {/* Brightness */}
        <div className="space-y-2">
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
            className="slider"
          />
        </div>

        {/* Grayscale */}
        <div className="space-y-2">
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
            className="slider"
          />
        </div>
      </div>

      {/* View & Crop Section */}
      {onZoomIn && onCrop && (
        <div className="pt-4 border-t border-gray-800/50 flex space-x-2">
           <div className="flex-1 bg-gray-800 rounded-lg flex items-center p-1">
             <button onClick={onZoomOut} disabled={disabled} className="flex-1 flex justify-center p-1 text-gray-400 hover:text-emerald-400 disabled:opacity-50"><IconZoomOut /></button>
             <div className="w-px h-4 bg-gray-700"></div>
             <button onClick={onZoomIn} disabled={disabled} className="flex-1 flex justify-center p-1 text-gray-400 hover:text-emerald-400 disabled:opacity-50"><IconZoomIn /></button>
           </div>
           <button 
             onClick={onCrop} 
             disabled={disabled}
             className="flex-1 bg-emerald-900/20 border border-emerald-900/50 text-emerald-400 rounded-lg flex items-center justify-center space-x-1 text-xs font-bold uppercase tracking-wide hover:bg-emerald-900/40 transition-colors disabled:opacity-50"
           >
             <IconCrop />
             <span>Crop to View</span>
           </button>
        </div>
      )}

      <style>{`
        .tool-btn {
          @apply flex items-center justify-center p-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-emerald-400 hover:border-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed;
        }
        .slider {
          @apply w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50;
        }
      `}</style>
    </div>
  );
};

export default ImageControls;