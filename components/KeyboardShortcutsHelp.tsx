import React, { useEffect } from 'react';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ isOpen, onClose }) => {
  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcuts = [
    {
      category: 'General',
      items: [
        { keys: ['Ctrl', 'O'], description: 'Open file' },
        { keys: ['Ctrl', 'R'], description: 'Reset workspace' },
        { keys: ['Ctrl', 'Enter'], description: 'Start OCR processing' },
        { keys: ['Shift', '?'], description: 'Show help' },
      ],
    },
    {
      category: 'Image Editing',
      items: [
        { keys: ['Shift', 'L'], description: 'Rotate left 90°' },
        { keys: ['Shift', 'R'], description: 'Rotate right 90°' },
        { keys: ['H'], description: 'Flip horizontal' },
        { keys: ['V'], description: 'Flip vertical' },
        { keys: ['I'], description: 'Invert colors' },
        { keys: ['C'], description: 'Crop to view' },
      ],
    },
    {
      category: 'View Controls',
      items: [
        { keys: ['Ctrl', '+'], description: 'Zoom in' },
        { keys: ['Ctrl', '-'], description: 'Zoom out' },
        { keys: ['Ctrl', 'Scroll'], description: 'Zoom in/out' },
        { keys: ['Drag'], description: 'Pan image' },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-xl border border-gray-800 shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-100">⌨️ Keyboard Shortcuts</h2>
            <p className="text-sm text-gray-500 mt-1">
              Speed up your workflow with these shortcuts
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
            title="Close (Esc)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {shortcuts.map((section, idx) => (
            <div key={idx}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="flex items-center justify-between py-2 px-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <span className="text-sm text-gray-300">{shortcut.description}</span>
                    <div className="flex items-center space-x-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <React.Fragment key={keyIdx}>
                          {keyIdx > 0 && <span className="text-gray-600 text-xs">+</span>}
                          <kbd className="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs font-mono text-emerald-400 shadow-sm min-w-[2rem] text-center">
                            {key}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 p-4 text-center">
          <p className="text-xs text-gray-600">
            💡 Tip: Most shortcuts work when you&apos;re in the Editor tab
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;
