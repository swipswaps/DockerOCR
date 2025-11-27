import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
    >
      <div
        className="bg-gray-900 rounded-xl border border-gray-800 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
          <h2 id="help-modal-title" className="text-lg font-bold text-gray-100">
            Keyboard Shortcuts & Help
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
            aria-label="Close help modal"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">
              Keyboard Shortcuts
            </h3>
            <div className="space-y-2">
              <ShortcutItem shortcut="Ctrl + O" description="Open file dialog" />
              <ShortcutItem shortcut="Ctrl + R" description="Reset workspace" />
              <ShortcutItem shortcut="Ctrl + Enter" description="Start OCR processing" />
              <ShortcutItem shortcut="Ctrl + Mouse Wheel" description="Zoom in/out on image" />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">
              Workflow
            </h3>
            <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
              <li>Upload an image (PNG, JPG, or HEIC) in the Source tab</li>
              <li>Adjust filters, rotation, and crop in the Editor tab</li>
              <li>Select OCR engine and start processing in the Process tab</li>
              <li>View results in multiple formats (JSON, Text, CSV, XLSX, SQL)</li>
              <li>Use Text Select mode to copy specific text from the image</li>
            </ol>
          </section>

          <section>
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">
              Features
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>✓ HEIC format support with automatic conversion</li>
              <li>✓ Image filters (contrast, brightness, grayscale, invert)</li>
              <li>✓ Rotation and flip transformations</li>
              <li>✓ Zoom and pan for detailed inspection</li>
              <li>✓ Crop to visible area</li>
              <li>✓ Multiple export formats</li>
              <li>✓ Text overlay with selectable regions</li>
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">
              Tips
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• Increase contrast for better OCR accuracy on low-quality scans</li>
              <li>• Use grayscale filter to improve text detection</li>
              <li>• Crop to focus on specific regions for faster processing</li>
              <li>• HEIC files are automatically converted for preview</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

const ShortcutItem: React.FC<{ shortcut: string; description: string }> = ({
  shortcut,
  description,
}) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-gray-300">{description}</span>
    <kbd className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs font-mono text-emerald-400">
      {shortcut}
    </kbd>
  </div>
);

export default HelpModal;
