# 🔄 Image Rotation & OCR Extraction Guide

## How Rotation Works with OCR

### Current Implementation ✅

The DockerOCR application **correctly applies rotation before OCR extraction**. Here's how:

#### 1. **Image Upload**
- User uploads an image (e.g., a photo taken sideways)
- `previewUrl` stores the **original, unrotated** image data
- Preview shows the image as-is

#### 2. **Rotation in Editor**
- User clicks "Rotate Right" or "Rotate Left" buttons
- Rotation angle is stored in `filters.rotation` (0°, 90°, 180°, or 270°)
- **Preview shows rotated image** using CSS transforms (visual only)
- **Original image data remains unchanged**

#### 3. **OCR Processing**
When user clicks "Run OCR":

```typescript
// Step 1: Generate processed image with rotation applied
payloadBase64 = await generateProcessedImage(previewUrl, filters);

// Step 2: Send rotated image to OCR engine
const data = await performOCRExtraction(
  selectedFile,
  payloadBase64,  // ← This is the ROTATED image
  onLog,
  engine
);
```

#### 4. **How `generateProcessedImage` Works**

```typescript
// 1. Load original image
const img = new Image();
img.src = originalBase64;  // Original, unrotated image

// 2. Create canvas with swapped dimensions for 90°/270° rotations
if (rotation % 180 !== 0) {
  canvas.width = height;   // Swap!
  canvas.height = width;
} else {
  canvas.width = width;
  canvas.height = height;
}

// 3. Apply rotation transformation
ctx.translate(canvas.width / 2, canvas.height / 2);  // Center
ctx.rotate((rotation * Math.PI) / 180);              // Rotate
ctx.drawImage(img, -width / 2, -height / 2);         // Draw rotated

// 4. Export as new image
return canvas.toDataURL('image/jpeg');  // ← Rotated image!
```

### Verification Features

#### Console Logs
When processing with rotation, you'll see:
```
Current filters: rotation=90°, flipH=false, flipV=false
✅ Image rotated 90° before OCR extraction
Image optimized for transmission.
Processed image size: 245KB (original: 312KB)
```

#### Browser Console (F12)
```
[generateProcessedImage] Original: 1200x800, Scaled: 1200x800, Canvas: 800x1200, Rotation: 90°
[generateProcessedImage] Generated rotated image: data:image/jpeg;base64,/9j/4AAQSkZJRg...
[DEBUG] Images are different: true
```

### Common Issues & Solutions

#### Issue 1: "OCR extracts text from unrotated image"

**Possible Causes:**
1. ❌ `generateProcessedImage()` threw an error → fell back to original
2. ❌ Rotation angle is 0° (not actually rotated)
3. ❌ Browser console shows errors

**Solution:**
1. Open browser console (F12)
2. Rotate the image in Editor tab
3. Click "Run OCR" in Process tab
4. Check console for:
   - `[generateProcessedImage]` logs showing rotation
   - Any error messages
   - "Images are different: true"

#### Issue 2: "Rotation indicator shows but OCR ignores it"

**Check Process Logs:**
- ✅ Should see: "✅ Image rotated 90° before OCR extraction"
- ❌ If you see: "⚠️ Optimization failed: ... Using original."
  - This means `generateProcessedImage()` failed
  - Check browser console for the actual error

#### Issue 3: "Text is still sideways after rotation"

**Verify Rotation Direction:**
- If image text is sideways to the RIGHT → Click "Rotate Left" (or "Rotate Right" 3 times)
- If image text is sideways to the LEFT → Click "Rotate Right" (or "Rotate Left" 3 times)
- If image text is upside down → Click "Rotate Right" 2 times

**Rotation Angles:**
- 0° = Original orientation
- 90° = Rotated 90° clockwise
- 180° = Upside down
- 270° = Rotated 90° counter-clockwise (same as -90°)

### Testing Rotation

#### Manual Test:
1. Upload an image with clearly oriented text
2. Rotate it 90° in the Editor tab
3. Look for the indicator: "🔄 Rotated 90° (will be applied to OCR)"
4. Switch to Process tab
5. Click "Run OCR"
6. Check logs for: "✅ Image rotated 90° before OCR extraction"
7. Verify extracted text is correct

#### Automated Test:
```bash
npx playwright test tests/verify-rotation-transform.spec.ts
```

Expected output:
```
✅ 0° rotation preserves dimensions
✅ 90° rotation swaps dimensions
✅ 180° rotation preserves dimensions
✅ 270° rotation swaps dimensions
```

### Technical Details

#### Image Dimensions After Rotation

| Original | Rotation | Canvas Size | Result |
|----------|----------|-------------|--------|
| 800x600  | 0°       | 800x600     | Same   |
| 800x600  | 90°      | 600x800     | Swapped|
| 800x600  | 180°     | 800x600     | Same   |
| 800x600  | 270°     | 600x800     | Swapped|

#### Bounding Box Coordinates

OCR engines return bounding boxes in the **rotated image's coordinate system**.

Example:
- Original image: 1000x500 (landscape)
- Rotated 90°: 500x1000 (portrait)
- OCR receives the 500x1000 rotated image
- Bounding boxes are relative to 500x1000 dimensions
- TextOverlay displays them on the rotated image → **Perfect alignment!**

### Debugging Checklist

If rotation isn't working:

- [ ] Check browser console (F12) for errors
- [ ] Verify rotation indicator shows: "🔄 Rotated X°"
- [ ] Check Process logs for: "✅ Image rotated X° before OCR extraction"
- [ ] Look for: "⚠️ Optimization failed" (indicates error)
- [ ] Verify: "Images are different: true" in console
- [ ] Check canvas dimensions in console match expected rotation
- [ ] Try different rotation angles (90°, 180°, 270°)
- [ ] Test with a different image
- [ ] Clear browser cache and reload

### Need Help?

If rotation still isn't working after checking the above:

1. Open browser console (F12)
2. Reproduce the issue
3. Copy ALL console logs
4. Copy ALL process logs from the UI
5. Report the issue with the logs

The logs will show exactly where the rotation is failing.

