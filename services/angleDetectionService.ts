import { createWorker } from 'tesseract.js';

export interface AngleDetectionResult {
  angle: number;
  confidence: number;
  method: 'tesseract' | 'manual' | 'dimension-heuristic';
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

    // Tesseract.js cannot properly detect rotation (OSD mode returns empty, AUTO mode auto-corrects)
    // Use PaddleOCR server's Tesseract OSD endpoint instead (integrated into Docker container)
    onProgress?.(50, 'Calling Tesseract OSD for rotation detection...');

    try {
      const response = await fetch('http://localhost:5000/detect-rotation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const result = await response.json();

      onProgress?.(70, `DEBUG: Tesseract OSD result: orientation=${result.orientation}°, rotate=${result.rotate}°, confidence=${result.confidence}`);

      if (result.success && result.orientation !== undefined) {
        const orientation = result.orientation;
        // Tesseract OSD confidence is on 0-15 scale, normalize to 0-1
        const confidence = Math.min(result.confidence / 15, 1.0);

        onProgress?.(80, `✅ Tesseract OSD detected: ${orientation}° rotation (confidence: ${result.confidence.toFixed(1)}/15 = ${(confidence * 100).toFixed(0)}%)`);

        // Tesseract reports current orientation, we need to apply correction
        // "Orientation in degrees: 90" means image is rotated 90° clockwise
        // We need to rotate 270° to correct it (90° counter-clockwise)
        let correctionAngle = 0;
        if (orientation === 90) {
          correctionAngle = 270;
        } else if (orientation === 180) {
          correctionAngle = 180;
        } else if (orientation === 270) {
          correctionAngle = 90;
        }

        onProgress?.(100, `Applying ${correctionAngle}° rotation to correct ${orientation}° orientation`);

        await worker.terminate();

        return {
          angle: correctionAngle,
          confidence: confidence,
          method: 'tesseract'
        };
      }

      throw new Error('No orientation data in server response');

    } catch (serverError) {
      // Server not available or failed - fall back to assuming no rotation
      onProgress?.(60, `WARN: Tesseract OSD unavailable: ${serverError}`);
      onProgress?.(70, `PaddleOCR container may not be running or Tesseract not installed`);

      // Terminate worker since we're not using it
      await worker.terminate();

      // Assume no rotation needed when server is unavailable
      onProgress?.(100, `Assuming no rotation needed (OSD unavailable)`);

      return {
        angle: 0,
        confidence: 0.3,
        method: 'dimension-heuristic'
      };
    }
  } catch (error) {
    console.error('Angle detection failed:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    onProgress?.(100, `ERROR: Orientation detection failed: ${errorMsg}`);
    if (errorStack) {
      onProgress?.(100, `ERROR: Stack trace: ${errorStack.split('\n').slice(0, 3).join(' | ')}`);
    }

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

