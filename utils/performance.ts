/**
 * Performance utilities for optimization
 */

/**
 * Debounce function to limit execution rate
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function to limit execution frequency
 */
export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Create a cancelable promise
 */
export const makeCancelable = <T>(promise: Promise<T>) => {
  let hasCanceled = false;

  const wrappedPromise = new Promise<T>((resolve, reject) => {
    promise
      .then((val) => (hasCanceled ? reject({ isCanceled: true }) : resolve(val)))
      .catch((error) => (hasCanceled ? reject({ isCanceled: true }) : reject(error)));
  });

  return {
    promise: wrappedPromise,
    cancel() {
      hasCanceled = true;
    },
  };
};

/**
 * Measure performance of a function
 */
export const measurePerformance = async <T>(name: string, fn: () => Promise<T> | T): Promise<T> => {
  const start = performance.now();
  try {
    const result = await fn();
    const end = performance.now();
    console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
    return result;
  } catch (error) {
    const end = performance.now();
    console.error(`[Performance] ${name} failed after ${(end - start).toFixed(2)}ms`);
    throw error;
  }
};

/**
 * Lazy load an image
 */
export const lazyLoadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Check if device has sufficient memory
 */
export const hasEnoughMemory = (requiredMB: number = 100): boolean => {
  if ('deviceMemory' in navigator) {
    const deviceMemory = (navigator as { deviceMemory?: number }).deviceMemory;
    return (deviceMemory ?? 4) >= requiredMB / 1024;
  }
  return true; // Assume sufficient if API not available
};

/**
 * Request idle callback wrapper
 */
export const requestIdleCallback = (callback: () => void, timeout = 1000): void => {
  if ('requestIdleCallback' in window) {
    (
      window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
      }
    ).requestIdleCallback?.(callback, { timeout });
  } else {
    setTimeout(callback, 1);
  }
};
