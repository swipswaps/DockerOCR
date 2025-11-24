import { createWorker } from 'tesseract.js';

export interface AngleDetectionResult {
  angle: number;
  confidence: number;
  method: 'tesseract' | 'manual';
}

/**
 * Detect the rotation angle of text in an image using Tesseract.js OSD (Orientation and Script Detection)
 * This is MUCH faster than full OCR as it only detects orientation without reading text
 * Returns the angle needed to correct the rotation (0, 90, 180, or 270 degrees)
 */
export async function detectRotationAngle(
  imageData: string,
  onProgress?: (progress: number, status: string) => void
): Promise<AngleDetectionResult> {
  try {
    onProgress?.(0, 'Initializing orientation detection...');

    // Track last progress to avoid duplicate logs
    let lastProgress = -1;

    // Create worker with OSD (Orientation and Script Detection) mode
    // This is MUCH faster than full OCR - only detects orientation
    const worker = await createWorker('osd', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' || m.status === 'loading tesseract core') {
          const currentProgress = Math.round(m.progress * 100);
          // Only log if progress changed by at least 10% to reduce spam
          if (currentProgress !== lastProgress && (currentProgress - lastProgress >= 10 || currentProgress === 100)) {
            lastProgress = currentProgress;
            onProgress?.(currentProgress, `Detecting orientation: ${currentProgress}%`);
          }
        }
      }
    });

    onProgress?.(50, 'Analyzing image orientation...');

    // Use detect() for OSD mode - much faster than recognize()
    const { data } = await worker.detect(imageData);

    await worker.terminate();

    // Tesseract OSD provides orientation information
    // orientation_degrees: 0, 90, 180, or 270
    // orientation_confidence: 0-100
    const detectedAngle = (data as any).orientation_degrees || 0;
    const confidence = ((data as any).orientation_confidence || 0) / 100; // Convert to 0-1 range

    onProgress?.(100, `Detected rotation: ${detectedAngle}° (confidence: ${(confidence * 100).toFixed(0)}%)`);

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
    const errorMsg = error instanceof Error ? error.message : String(error);
    onProgress?.(100, `Orientation detection failed: ${errorMsg}`);

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

