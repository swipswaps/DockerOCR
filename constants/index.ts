import { ImageFilters } from '../types';

/**
 * Application constants
 */

// App version for cache busting - updated automatically during build
// This MUST be updated whenever you want to invalidate browser caches
export const APP_VERSION = '2.0.0-' + Date.now().toString(36);

// Image Processing
export const DEFAULT_FILTERS: ImageFilters = {
  contrast: 100,
  brightness: 100,
  grayscale: 0,
  rotation: 0,
  flipH: false,
  flipV: false,
  invert: false,
};

export const DEFAULT_VIEW_STATE = {
  zoom: 1,
  offset: { x: 0, y: 0 },
};

// Image constraints
export const MAX_IMAGE_DIMENSION = 1500;
export const IMAGE_QUALITY = 0.7;
export const CROP_IMAGE_QUALITY = 0.85;

// Zoom limits
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 5;
export const ZOOM_STEP = 1.1;

// Filter ranges
export const CONTRAST_RANGE = { min: 50, max: 200 };
export const BRIGHTNESS_RANGE = { min: 50, max: 200 };
export const GRAYSCALE_RANGE = { min: 0, max: 100 };

// Supported file types
export const SUPPORTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/heic',
] as const;

export const SUPPORTED_FILE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.heic'] as const;

// OCR Models
export const GEMINI_MODEL = 'gemini-2.5-flash';

// Timeouts and delays
export const PROCESSING_DELAY = 500;
export const HEIC_CONVERSION_QUALITY = 0.8;

// UI Messages
export const MESSAGES = {
  NO_API_KEY: 'API key not configured. Please set GEMINI_API_KEY in .env.local',
  FILE_TOO_LARGE: 'File size exceeds maximum allowed size',
  UNSUPPORTED_FORMAT: 'Unsupported file format',
  PROCESSING_ERROR: 'An error occurred during processing',
  NETWORK_ERROR: 'Network error. Please check your connection.',
} as const;
