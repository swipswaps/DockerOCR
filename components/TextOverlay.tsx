import React from 'react';
import { OCRBlock } from '../types';

interface TextOverlayProps {
  imageUrl: string;
  blocks: OCRBlock[];
}

const TextOverlay: React.FC<TextOverlayProps> = ({ imageUrl, blocks }) => {
  return (
    <div className="relative inline-block max-w-full shadow-2xl">
      {/* 
        Display the processed image. 
        max-height: 70vh ensures it doesn't overflow the screen vertically too much.
        bg-gray-900 ensures we see the box even if image is transparent/loading.
      */}
      <img
        src={imageUrl}
        alt="OCR Content"
        className="block max-w-full h-auto object-contain select-none bg-gray-900"
        style={{ maxHeight: '70vh' }}
      />

      {/* Overlay Container */}
      <div className="absolute inset-0 z-10">
        {blocks.map((block, idx) => {
          if (!block.bbox || block.bbox.length < 4) return null;

          const xs = block.bbox.map((p) => p[0]);
          const ys = block.bbox.map((p) => p[1]);

          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);

          // Convert normalized 0-1000 coordinates to percentages
          const left = minX / 10;
          const top = minY / 10;
          const width = (maxX - minX) / 10;
          const height = (maxY - minY) / 10;

          return (
            <div
              key={idx}
              title={block.text}
              style={{
                position: 'absolute',
                left: `${left}%`,
                top: `${top}%`,
                width: `${width}%`,
                height: `${height}%`,
                display: 'flex',
                alignItems: 'center',
                whiteSpace: 'nowrap',
                cursor: 'text',
                userSelect: 'text',
                WebkitUserSelect: 'text',
              }}
              className="group hover:bg-emerald-500/10 transition-colors"
            >
              {/* 
                 Invisible text that matches the position of the image text.
                 This allows the user to drag-select "natively".
                 Using vw units for responsive font sizing as a safe fallback.
              */}
              <span
                className="w-full h-full text-transparent selection:bg-emerald-500/40 selection:text-transparent"
                style={{ fontSize: '1.2vw', lineHeight: 1 }}
              >
                {block.text}
              </span>
              {/* Visual Highlight Border on Hover */}
              <div className="absolute inset-0 border border-emerald-400/40 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity rounded-sm"></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TextOverlay;
