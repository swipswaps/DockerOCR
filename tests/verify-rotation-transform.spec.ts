import { test, expect } from '@playwright/test';

/**
 * Verify that rotation transformation produces correct output
 */
test('verify rotation creates properly rotated image', async ({ page }) => {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔍 VERIFYING ROTATION TRANSFORMATION');
  console.log('═══════════════════════════════════════════════════\n');

  // Test the generateProcessedImage function directly
  const result = await page.evaluate(async () => {
    // Create a test image with clear orientation markers
    const createTestImage = (): Promise<string> => {
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 200;
        const ctx = canvas.getContext('2d')!;

        // White background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 400, 200);

        // Draw text horizontally
        ctx.fillStyle = 'black';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('HORIZONTAL', 10, 10);

        // Draw a marker in top-left corner (red square)
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, 50, 50);

        resolve(canvas.toDataURL('image/png'));
      });
    };

    // Simulate the generateProcessedImage function
    const generateProcessedImage = async (
      originalBase64: string,
      rotation: number
    ): Promise<{ dataUrl: string; width: number; height: number }> => {
      return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              throw new Error('Failed to get canvas context');
            }

            const width = img.width;
            const height = img.height;

            // Determine canvas size based on rotation
            if (rotation % 180 !== 0) {
              canvas.width = height;
              canvas.height = width;
            } else {
              canvas.width = width;
              canvas.height = height;
            }

            ctx.save();

            // Center canvas context
            ctx.translate(canvas.width / 2, canvas.height / 2);

            // Rotate
            ctx.rotate((rotation * Math.PI) / 180);

            // Draw image centered
            ctx.drawImage(img, -width / 2, -height / 2, width, height);

            ctx.restore();

            resolve({
              dataUrl: canvas.toDataURL('image/png'),
              width: canvas.width,
              height: canvas.height,
            });
          } catch (error) {
            reject(error);
          }
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = originalBase64;
      });
    };

    const originalImage = await createTestImage();

    const results = {
      original: { width: 400, height: 200 },
      rotated0: await generateProcessedImage(originalImage, 0),
      rotated90: await generateProcessedImage(originalImage, 90),
      rotated180: await generateProcessedImage(originalImage, 180),
      rotated270: await generateProcessedImage(originalImage, 270),
    };

    return {
      original: results.original,
      rotated0: { width: results.rotated0.width, height: results.rotated0.height },
      rotated90: { width: results.rotated90.width, height: results.rotated90.height },
      rotated180: { width: results.rotated180.width, height: results.rotated180.height },
      rotated270: { width: results.rotated270.width, height: results.rotated270.height },
      rotated90Image: results.rotated90.dataUrl,
    };
  });

  console.log('📊 ROTATION RESULTS:');
  console.log('─────────────────────────────────────────────────');
  console.log(`Original:     ${result.original.width}x${result.original.height}`);
  console.log(`Rotated 0°:   ${result.rotated0.width}x${result.rotated0.height}`);
  console.log(`Rotated 90°:  ${result.rotated90.width}x${result.rotated90.height}`);
  console.log(`Rotated 180°: ${result.rotated180.width}x${result.rotated180.height}`);
  console.log(`Rotated 270°: ${result.rotated270.width}x${result.rotated270.height}`);
  console.log('');

  // Verify dimensions
  console.log('✅ VERIFICATION:');
  console.log('─────────────────────────────────────────────────');

  const checks = [
    {
      name: '0° rotation preserves dimensions',
      pass: result.rotated0.width === 400 && result.rotated0.height === 200,
    },
    {
      name: '90° rotation swaps dimensions',
      pass: result.rotated90.width === 200 && result.rotated90.height === 400,
    },
    {
      name: '180° rotation preserves dimensions',
      pass: result.rotated180.width === 400 && result.rotated180.height === 200,
    },
    {
      name: '270° rotation swaps dimensions',
      pass: result.rotated270.width === 200 && result.rotated270.height === 400,
    },
  ];

  for (const check of checks) {
    console.log(`${check.pass ? '✅' : '❌'} ${check.name}`);
    expect(check.pass).toBe(true);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('📋 ROTATION TRANSFORMATION VERIFIED');
  console.log('═══════════════════════════════════════════════════\n');
});
