import React, { useState, useRef, useEffect } from 'react';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropSelectorProps {
  imageWidth: number;
  imageHeight: number;
  onCropChange: (crop: CropArea | null) => void;
  isActive: boolean;
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null;

const CropSelector: React.FC<CropSelectorProps> = ({ onCropChange, isActive }) => {
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) {
      // Delay state updates to avoid synchronous setState in effect
      const timeoutId = setTimeout(() => {
        setCropArea(null);
        onCropChange(null);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [isActive, onCropChange]);

  const handleMouseDown = (e: React.MouseEvent, handle?: ResizeHandle) => {
    if (!isActive) return;

    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (handle) {
      // Resizing existing crop
      setIsResizing(true);
      setResizeHandle(handle);
      setDragStart({ x, y });
    } else if (
      cropArea &&
      x >= cropArea.x &&
      x <= cropArea.x + cropArea.width &&
      y >= cropArea.y &&
      y <= cropArea.y + cropArea.height
    ) {
      // Dragging existing crop
      setIsDragging(true);
      setDragStart({ x: x - cropArea.x, y: y - cropArea.y });
    } else {
      // Creating new crop
      setCropArea({ x, y, width: 0, height: 0 });
      setIsResizing(true);
      setResizeHandle('se');
      setDragStart({ x, y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isActive || (!isDragging && !isResizing) || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (isDragging && cropArea) {
      // Move crop area
      const newX = Math.max(0, Math.min(100 - cropArea.width, x - dragStart.x));
      const newY = Math.max(0, Math.min(100 - cropArea.height, y - dragStart.y));
      const newCrop = { ...cropArea, x: newX, y: newY };
      setCropArea(newCrop);
      onCropChange(newCrop);
    } else if (isResizing && cropArea) {
      // Resize crop area
      const newCrop = { ...cropArea };
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;

      if (resizeHandle?.includes('e')) {
        newCrop.width = Math.max(5, Math.min(100 - newCrop.x, cropArea.width + dx));
      }
      if (resizeHandle?.includes('w')) {
        const newWidth = Math.max(5, cropArea.width - dx);
        const newX = Math.max(0, cropArea.x + (cropArea.width - newWidth));
        newCrop.x = newX;
        newCrop.width = newWidth;
      }
      if (resizeHandle?.includes('s')) {
        newCrop.height = Math.max(5, Math.min(100 - newCrop.y, cropArea.height + dy));
      }
      if (resizeHandle?.includes('n')) {
        const newHeight = Math.max(5, cropArea.height - dy);
        const newY = Math.max(0, cropArea.y + (cropArea.height - newHeight));
        newCrop.y = newY;
        newCrop.height = newHeight;
      }

      setCropArea(newCrop);
      onCropChange(newCrop);
      setDragStart({ x, y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  if (!isActive || !cropArea) {
    return (
      <div
        ref={containerRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Darkened overlay outside crop area */}
      <div className="absolute inset-0 pointer-events-none">
        <svg width="100%" height="100%" className="absolute inset-0">
          <defs>
            <mask id="crop-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={`${cropArea.x}%`}
                y={`${cropArea.y}%`}
                width={`${cropArea.width}%`}
                height={`${cropArea.height}%`}
                fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.5)" mask="url(#crop-mask)" />
        </svg>
      </div>

      {/* Crop area border and handles */}
      <div
        className="absolute border-2 border-dashed border-emerald-400 cursor-move"
        style={{
          left: `${cropArea.x}%`,
          top: `${cropArea.y}%`,
          width: `${cropArea.width}%`,
          height: `${cropArea.height}%`,
        }}
      >
        {/* Corner handles */}
        <div
          className="absolute -top-1 -left-1 w-3 h-3 bg-emerald-400 border border-white cursor-nw-resize"
          onMouseDown={(e) => handleMouseDown(e, 'nw')}
        />
        <div
          className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border border-white cursor-ne-resize"
          onMouseDown={(e) => handleMouseDown(e, 'ne')}
        />
        <div
          className="absolute -bottom-1 -left-1 w-3 h-3 bg-emerald-400 border border-white cursor-sw-resize"
          onMouseDown={(e) => handleMouseDown(e, 'sw')}
        />
        <div
          className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-400 border border-white cursor-se-resize"
          onMouseDown={(e) => handleMouseDown(e, 'se')}
        />

        {/* Edge handles */}
        <div
          className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-emerald-400 border border-white cursor-n-resize"
          onMouseDown={(e) => handleMouseDown(e, 'n')}
        />
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-emerald-400 border border-white cursor-s-resize"
          onMouseDown={(e) => handleMouseDown(e, 's')}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -left-1 w-3 h-3 bg-emerald-400 border border-white cursor-w-resize"
          onMouseDown={(e) => handleMouseDown(e, 'w')}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -right-1 w-3 h-3 bg-emerald-400 border border-white cursor-e-resize"
          onMouseDown={(e) => handleMouseDown(e, 'e')}
        />

        {/* Crop area label */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-emerald-900/90 text-emerald-300 text-xs px-2 py-0.5 rounded border border-emerald-700 font-medium whitespace-nowrap">
          {Math.round(cropArea.width)}% × {Math.round(cropArea.height)}%
        </div>
      </div>
    </div>
  );
};

export default CropSelector;
