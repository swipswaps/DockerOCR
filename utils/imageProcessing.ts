import { ImageFilters } from '../types';
import { MAX_IMAGE_DIMENSION, IMAGE_QUALITY } from '../constants';

/**
 * Generates a processed image with filters applied
 */
export const generateProcessedImage = async (
  originalBase64: string,
  currentFilters: ImageFilters
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        // Calculate scaling to limit max dimension
        const scale = calculateScale(img.width, img.height, MAX_IMAGE_DIMENSION);
        const width = img.width * scale;
        const height = img.height * scale;

        // Determine canvas size based on rotation
        if (currentFilters.rotation % 180 !== 0) {
          canvas.width = height;
          canvas.height = width;
        } else {
          canvas.width = width;
          canvas.height = height;
        }

        ctx.save();
        
        // Apply filters
        ctx.filter = buildFilterString(currentFilters);

        // Center canvas context
        ctx.translate(canvas.width / 2, canvas.height / 2);
        
        // Rotate
        ctx.rotate((currentFilters.rotation * Math.PI) / 180);
        
        // Flip
        ctx.scale(
          currentFilters.flipH ? -1 : 1,
          currentFilters.flipV ? -1 : 1
        );

        // Draw image centered
        ctx.drawImage(img, -width / 2, -height / 2, width, height);
        
        ctx.restore();
        
        resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = originalBase64;
  });
};

/**
 * Calculate scale factor to fit image within max dimension
 */
export const calculateScale = (
  width: number,
  height: number,
  maxDim: number
): number => {
  if (width <= maxDim && height <= maxDim) {
    return 1;
  }
  return maxDim / Math.max(width, height);
};

/**
 * Build CSS filter string from ImageFilters
 */
export const buildFilterString = (filters: ImageFilters): string => {
  return `contrast(${filters.contrast}%) brightness(${filters.brightness}%) grayscale(${filters.grayscale}%) invert(${filters.invert ? 100 : 0}%)`;
};

/**
 * Check if file is a supported image type
 */
export const isSupportedImageType = (file: File): boolean => {
  const supportedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/heic'];
  const supportedExtensions = ['.png', '.jpg', '.jpeg', '.heic'];
  
  return (
    supportedTypes.includes(file.type) ||
    supportedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
  );
};

/**
 * Check if file is HEIC format
 */
export const isHeicFile = (file: File): boolean => {
  return file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic';
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * Get file format from file
 */
export const getFileFormat = (file: File): string => {
  if (isHeicFile(file)) return 'HEIC';
  const format = file.type.split('/')[1];
  return format ? format.toUpperCase() : 'UNKNOWN';
};

