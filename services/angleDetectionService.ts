import { createWorker, PSM } from 'tesseract.js';

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

    // Create worker with English language model
    // We'll use recognize() with PSM 0 (OSD only) for orientation detection
    const worker = await createWorker('eng', 1, {
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

    // Set PSM (Page Segmentation Mode) to OSD_ONLY (Orientation and Script Detection)
    // This is faster than full OCR as it only detects orientation
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.OSD_ONLY,
    });

    onProgress?.(50, 'Analyzing image orientation...');

    // Use recognize() but with PSM OSD_ONLY it will only do orientation detection
    const { data } = await worker.recognize(imageData);

    await worker.terminate();

    // Parse the OSD (Orientation and Script Detection) output
    // The data.osd contains text like "Orientation: 0\nRotate: 90\n..."
    const osdText = data.osd || '';

    // Extract rotation angle from OSD output
    // Format: "Rotate: 90" means image needs 90° rotation to be upright
    const rotateMatch = osdText.match(/Rotate:\s*(\d+)/);
    const detectedAngle = rotateMatch ? parseInt(rotateMatch[1], 10) : 0;

    // Extract orientation confidence if available
    // Format: "Orientation confidence: 12.34"
    const confMatch = osdText.match(/Orientation confidence:\s*([\d.]+)/);
    const rawConfidence = confMatch ? parseFloat(confMatch[1]) : 10;

    // Tesseract OSD confidence is typically 0-15 scale, normalize to 0-1
    const confidence = Math.min(rawConfidence / 15, 1.0);

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

