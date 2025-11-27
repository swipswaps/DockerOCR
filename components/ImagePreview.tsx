import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { ImageFilters } from '../types';

interface ImagePreviewProps {
  src: string;
  filters: ImageFilters;
  zoom: number;
  offset: { x: number; y: number };
  onViewChange: (zoom: number, offset: { x: number; y: number }) => void;
}

export interface ImagePreviewRef {
  getCroppedImage: () => Promise<string>;
}

const ImagePreview = forwardRef<ImagePreviewRef, ImagePreviewProps>(function ImagePreview(
  { src, filters, zoom, offset, onViewChange },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Handle Mouse/Touch Events for Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    onViewChange(zoom, { x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(Math.max(zoom * delta, 1), 5); // Limit zoom 1x to 5x
      onViewChange(newZoom, offset);
    }
  };

  // Expose Crop Functionality
  useImperativeHandle(ref, () => ({
    getCroppedImage: async () => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;

        img.onload = () => {
          const container = containerRef.current;
          if (!container) return reject('Container not found');

          // We use the container dimensions as the "Screen"
          // To get a high quality crop, ideally we map back to original image coords,
          // but since we have filters and rotations, "Snapshotting" the view is the most robust WYSIWYG method.
          // We set the canvas size to the container size (or scaled for Retina/HighRes).

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Use standard resolution for performance/payload size reduction
          canvas.width = container.clientWidth;
          canvas.height = container.clientHeight;

          if (!ctx) return reject('Canvas context error');

          // Fill black background
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Apply View Transforms (Center -> Pan -> Zoom)
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.translate(offset.x, offset.y);
          ctx.scale(zoom, zoom);

          // Apply Geometric Transforms & Filters
          // Note: ctx.filter is supported in modern browsers
          ctx.filter = `contrast(${filters.contrast}%) brightness(${filters.brightness}%) grayscale(${filters.grayscale}%) invert(${filters.invert ? 100 : 0}%)`;

          ctx.rotate((filters.rotation * Math.PI) / 180);
          ctx.scale(filters.flipH ? -1 : 1, filters.flipV ? -1 : 1);

          // Draw Image Centered
          // We need to calculate the aspect-fit dimensions that the img tag uses
          const imgAspect = img.width / img.height;
          const containerAspect = container.clientWidth / container.clientHeight;

          let drawWidth, drawHeight;

          if (imgAspect > containerAspect) {
            // Image is wider than container (relative to aspect) -> Fits Width
            drawWidth = container.clientWidth;
            drawHeight = container.clientWidth / imgAspect;
          } else {
            // Image is taller -> Fits Height
            drawHeight = container.clientHeight;
            drawWidth = container.clientHeight * imgAspect;
          }

          ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = (e) => reject(e);
      });
    },
  }));

  const imgStyle: React.CSSProperties = {
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${filters.rotation}deg) scaleX(${filters.flipH ? -1 : 1}) scaleY(${filters.flipV ? -1 : 1})`,
    filter: `contrast(${filters.contrast}%) brightness(${filters.brightness}%) grayscale(${filters.grayscale}%) invert(${filters.invert ? 100 : 0}%)`,
    cursor: isDragging ? 'grabbing' : zoom > 1 ? 'grab' : 'default',
    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    userSelect: 'none',
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden flex items-center justify-center bg-[#0B0F19] relative touch-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <img ref={imgRef} src={src} alt="Editor Preview" style={imgStyle} draggable={false} />
    </div>
  );
});

export default ImagePreview;
