# Contributing to DockerOCR

## Developer Guidelines

This document outlines critical patterns and anti-patterns learned from development. Follow these to avoid regressions.

---

## Architecture

- **React 19 + TypeScript 5.8 + Vite 6** web app
- **OCR engines**: PaddleOCR (Docker, localhost only) or Gemini API (GitHub Pages)
- **Deployed**: https://swipswaps.github.io/DockerOCR/
- **Bundle**: Split chunks via Vite `manualChunks`

---

## Critical Rules

### 1. Terminal/Logs MUST Always Be Visible

- **Never** hide Terminal behind conditionals, disabled tabs, or file upload requirements
- Users need to see status, progress, errors, and logs at **all times**
- Terminal is a fixed 200px section at the bottom of the left panel

### 2. State Initialization for Async Checks

- Use `null` for "not yet checked", not `false`
- Example: `isDockerHealthy: boolean | null = null`
- Only show warnings when state is confirmed `false`, not when `null`

```typescript
// ❌ Wrong - shows false warning before check completes
const [isDockerHealthy, setIsDockerHealthy] = useState(false);

// ✅ Correct - null means "checking", false means "confirmed unavailable"
const [isDockerHealthy, setIsDockerHealthy] = useState<boolean | null>(null);
```

### 3. Self-Healing Cache Mechanism

- `index.html` sets `window.__DOCKEROCR_VERIFY_VERSION__`
- `index.tsx` **MUST** call it to confirm JS loaded correctly
- Both files must be committed together

### 4. Always Test BOTH Environments

```bash
# Localhost
npm run build
rm -rf serve_local && mkdir -p serve_local/DockerOCR && cp -r dist/* serve_local/DockerOCR/
cd serve_local && python3 -m http.server 3000

# GitHub Pages (after push, wait ~45 seconds for deployment)
# https://swipswaps.github.io/DockerOCR/
```

### 5. Selenium Testing

- Use headless Chrome with `--incognito`
- Test image: `/home/owner/Documents/sunelec/IMG_0371.heic`
- Verify: Terminal visible, logs accumulating, image renders

---

## TypeScript/ESLint Fixes

| Issue | Wrong | Correct |
|-------|-------|---------|
| Timer types | `NodeJS.Timeout` | `ReturnType<typeof setTimeout>` |
| Imports | `require('fs')` | `import fs from 'fs'` |
| JSX apostrophes | `you're` | `you&apos;re` |
| forwardRef | Arrow function | `forwardRef(function Name(...))` |
| useEffect setState | Synchronous call | Wrap in `setTimeout(..., 0)` |
| Generic any | `(...args: any[])` | `(...args: unknown[])` |

---

## Commit Checklist

- [ ] `npm run lint` shows 0 errors
- [ ] `npm run build` succeeds
- [ ] Localhost test passes
- [ ] All related files committed together (especially `index.html` + `index.tsx`)
- [ ] Push and verify GitHub Pages deployment works

---

## Don't

- ❌ Hide logs/status behind UI conditionals
- ❌ Initialize async check states to `false`
- ❌ Commit partial changes
- ❌ Remove features when "optimizing"
- ❌ Use `require()` in TypeScript
- ❌ Skip GitHub Pages verification

## Do

- ✅ Keep Terminal always visible
- ✅ Use `null` for "unknown" states
- ✅ Test with real HEIC files
- ✅ Verify both localhost AND GitHub Pages
- ✅ Use ES module imports
- ✅ Run `npm run lint:fix` before committing

---

## NPM Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # Check for lint errors
npm run lint:fix     # Auto-fix lint errors
npm run format       # Format all files with Prettier
npm run format:check # Check formatting
npm run type-check   # TypeScript type checking
```

---

## Bundle Structure

The app is split into chunks for better caching:

| Chunk | Contents | Size |
|-------|----------|------|
| `index.js` | Main app code | ~255KB |
| `vendor-react.js` | React, ReactDOM | ~12KB |
| `vendor-tesseract.js` | Tesseract.js | ~15KB |
| `vendor-genai.js` | Google GenAI SDK | ~218KB |
| `vendor-excel.js` | ExcelJS | ~939KB |
| `vendor-image.js` | heic2any, exifr | ~1.3MB |

---

## Common Patterns

### Docker Health Check Pattern

```typescript
// Poll for health with proper state management
const [isDockerHealthy, setIsDockerHealthy] = useState<boolean | null>(null);

useEffect(() => {
  const checkHealth = async () => {
    try {
      const response = await fetch('http://localhost:5000/health');
      setIsDockerHealthy(response.ok);
    } catch {
      setIsDockerHealthy(false);
    }
  };
  checkHealth();
}, []);

// Only show warning when confirmed false
{isDockerHealthy === false && <Warning />}
```

### Avoiding useEffect setState Warnings

```typescript
// ❌ Wrong - synchronous setState in effect
useEffect(() => {
  if (!isActive) {
    setCropArea(null);
    onCropChange(null); // This triggers parent setState
  }
}, [isActive]);

// ✅ Correct - defer with setTimeout
useEffect(() => {
  if (!isActive) {
    const timeoutId = setTimeout(() => {
      setCropArea(null);
      onCropChange(null);
    }, 0);
    return () => clearTimeout(timeoutId);
  }
}, [isActive, onCropChange]);
```

