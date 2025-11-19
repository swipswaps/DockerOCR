export interface OCRBlock {
  text: string;
  confidence: number;
  bbox: number[][]; // [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
}

export interface OCRResult {
  file: string;
  text: string;
  blocks: OCRBlock[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
}

export interface ImageFilters {
  contrast: number;
  brightness: number;
  grayscale: number;
}

export enum ExtractionStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING', // Docker container running
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}
