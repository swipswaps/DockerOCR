import React from 'react';

export type Tool = 'select' | 'crop' | 'pan' | 'text';

interface ToolPaletteProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  textDisabled?: boolean;
}

const ToolPalette: React.FC<ToolPaletteProps> = ({
  activeTool,
  onToolChange,
  textDisabled = false,
}) => {
  const tools: {
    id: Tool;
    label: string;
    icon: React.ReactElement;
    disabled?: boolean;
    tooltip: string;
  }[] = [
    {
      id: 'select',
      label: 'Select',
      tooltip: 'Selection tool - Adjust filters, rotate, flip (V)',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
          />
        </svg>
      ),
    },
    {
      id: 'crop',
      label: 'Crop',
      tooltip: 'Crop tool - Drag to select crop area (C)',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"
          />
        </svg>
      ),
    },
    {
      id: 'pan',
      label: 'Pan',
      tooltip: 'Pan & Zoom tool - Navigate the image (H)',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
          />
        </svg>
      ),
    },
    {
      id: 'text',
      label: 'Text',
      tooltip: textDisabled
        ? 'Run OCR first to enable text selection'
        : 'Text selection tool - Select OCR text (T)',
      disabled: textDisabled,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col bg-gray-900 border border-gray-800 rounded-lg p-1 space-y-1 shadow-lg">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => !tool.disabled && onToolChange(tool.id)}
          disabled={tool.disabled}
          className={`
            flex flex-col items-center justify-center p-2 rounded transition-all
            ${
              activeTool === tool.id
                ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }
            ${tool.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
          `}
          title={tool.tooltip}
        >
          {tool.icon}
          <span className="text-[9px] font-medium mt-0.5 uppercase tracking-wide">
            {tool.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default ToolPalette;
