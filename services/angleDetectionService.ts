import { createWorker } from 'tesseract.js';

export interface AngleDetectionResult {
  angle: number;
  confidence: number;
  method: 'tesseract' | 'manual';
}

/**
 * Detect the rotation angle of text in an image using Tesseract.js
 * Returns the angle needed to correct the rotation (0, 90, 180, or 270 degrees)
 */
export async function detectRotationAngle(
  imageData: string,
  onProgress?: (progress: number, status: string) => void
): Promise<AngleDetectionResult> {
  try {
    onProgress?.(0, 'Initializing angle detection...');
    
    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          onProgress?.(m.progress * 100, `Analyzing orientation: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    onProgress?.(50, 'Detecting text orientation...');

    // Perform OCR to get orientation info
    const { data } = await worker.recognize(imageData);

    await worker.terminate();

    // Tesseract provides orientation information
    // orientation_degrees: 0, 90, 180, or 270
    // orientation_confidence: 0-100
    // Note: TypeScript types may not include these properties, but they exist at runtime
    const detectedAngle = (data as any).orientation_degrees || 0;
    const confidence = ((data as any).orientation_confidence || 0) / 100; // Convert to 0-1 range

    onProgress?.(100, `Detected rotation: ${detectedAngle}°`);

    // Calculate the correction angle (inverse of detected rotation)
    // If text is rotated 90° clockwise, we need to rotate 270° to correct it
    let correctionAngle = 0;
    if (detectedAngle === 90) {
      correctionAngle = 270;
    } else if (detectedAngle === 180) {
      correctionAngle = 180;
    } else if (detectedAngle === 270) {
      correctionAngle = 90;
    }

    return {
      angle: correctionAngle,
      confidence,
      method: 'tesseract'
    };
  } catch (error) {
    console.error('Angle detection failed:', error);
    
    // Fallback to manual (no rotation)
    return {
      angle: 0,
      confidence: 0,
      method: 'manual'
    };
  }
}

/**
 * Apply rotation to an image and return the rotated base64 data
 */
export async function rotateImage(
  imageData: string,
  angle: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Calculate new dimensions after rotation
      const radians = (angle * Math.PI) / 180;
      const sin = Math.abs(Math.sin(radians));
      const cos = Math.abs(Math.cos(radians));
      
      const newWidth = img.width * cos + img.height * sin;
      const newHeight = img.width * sin + img.height * cos;
      
      canvas.width = newWidth;
      canvas.height = newHeight;

      // Rotate around center
      ctx.translate(newWidth / 2, newHeight / 2);
      ctx.rotate(radians);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      // Return rotated image as base64
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for rotation'));
    };

    img.src = imageData;
  });
}

