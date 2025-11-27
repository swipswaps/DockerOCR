import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { ExtractionStatus, OCRResult, OCREngine } from './types';
import {
  IconUpload,
  IconFile,
  IconTabImage,
  IconTabSliders,
  IconTabPlay,
  IconRefresh,
  IconSelectText,
  IconEdit,
} from './components/Icons';
import Terminal from './components/Terminal';
import ResultsView from './components/ResultsView';
import ImageControls from './components/ImageControls';
import TextOverlay from './components/TextOverlay';
import ImagePreview, { ImagePreviewRef } from './components/ImagePreview';
import LoadingSpinner from './components/LoadingSpinner';
import HelpModal from './components/HelpModal';
import DockerSetupHelper from './components/DockerSetupHelper';
import { DockerHealthIndicator } from './components/DockerHealthIndicator';
import { performOCRExtraction } from './services/ocrService';
import { detectRotationAngle, rotateImage } from './services/angleDetectionService';
import { DEFAULT_VIEW_STATE, PROCESSING_DELAY } from './constants';
import { useImageFilters } from './hooks/useImageFilters';
import { useLogger } from './hooks/useLogger';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import {
  generateProcessedImage,
  isHeicFile,
  formatFileSize,
  getFileFormat,
} from './utils/imageProcessing';
import { hasApiKey } from './config/env';
import heic2any from 'heic2any';

type LeftTab = 'source' | 'editor' | 'process';
type ViewMode = 'edit' | 'text';

const App: React.FC = () => {
  const [status, setStatus] = useState<ExtractionStatus>(ExtractionStatus.IDLE);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [viewState, setViewState] = useState(DEFAULT_VIEW_STATE);
  const [isHeic, setIsHeic] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [engine, setEngine] = useState<OCREngine>('PADDLE'); // Default to PaddleOCR (no API key needed)
  const [activeLeftTab, setActiveLeftTab] = useState<LeftTab>('source');
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [showHelp, setShowHelp] = useState(false);
  const [showDockerSetup, setShowDockerSetup] = useState(false);
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(true); // Auto-rotation enabled by default
  const [isDockerHealthy, setIsDockerHealthy] = useState<boolean | null>(null); // null = not checked yet

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagePreviewRef = useRef<ImagePreviewRef>(null);
  const autoRotationDoneRef = useRef<string | null>(null); // Track which image has been auto-rotated
  const dockerWarningLoggedRef = useRef(false); // Track if Docker warning has been logged

  // Custom hooks - MUST be called unconditionally
  const { filters, setFilters, resetFilters } = useImageFilters();
  const { logs, addLog, clearLogs } = useLogger();

  // Initial app ready log - runs once on mount
  useEffect(() => {
    addLog('DockerOCR ready. Upload an image to begin.', 'INFO');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Log warning when Docker is confirmed unavailable (after health check completes)
  // Only log once to avoid spamming the terminal
  useEffect(() => {
    // Only log if: health check has completed (not null), Docker is unhealthy, and we haven't logged yet
    if (engine === 'PADDLE' && isDockerHealthy === false && !dockerWarningLoggedRef.current) {
      dockerWarningLoggedRef.current = true;
      addLog(
        '⚠️  Docker unavailable - PaddleOCR requires Docker. Please start Docker or switch to Gemini.',
        'WARN'
      );
    }
    // Reset the logged flag if Docker becomes healthy
    if (isDockerHealthy === true) {
      dockerWarningLoggedRef.current = false;
    }
  }, [engine, isDockerHealthy, addLog]);

  // Check API key availability
  const apiKeyConfigured = useMemo(() => hasApiKey(), []);

  // Auto-rotation when engine changes to PADDLE (if image already loaded)
  useEffect(() => {
    const runAutoRotation = async () => {
      // Only run if:
      // 1. Engine is PADDLE
      // 2. Auto-rotation is enabled
      // 3. There's a preview image loaded
      // 4. Haven't already auto-rotated this specific image
      if (
        engine === 'PADDLE' &&
        autoRotateEnabled &&
        previewUrl &&
        autoRotationDoneRef.current !== previewUrl
      ) {
        // Mark this image as being processed to prevent duplicate runs
        autoRotationDoneRef.current = previewUrl;

        addLog('Auto-detecting text orientation...', 'INFO');
        try {
          const angleResult = await detectRotationAngle(previewUrl, (_progress, status) => {
            addLog(status, 'INFO');
          });

          if (angleResult.confidence > 0.5 && angleResult.angle !== 0) {
            addLog(`Detected rotation: ${angleResult.angle}° - auto-correcting...`, 'SUCCESS');
            const rotatedImage = await rotateImage(previewUrl, angleResult.angle);
            setPreviewUrl(rotatedImage);
            // Update the ref to the rotated image URL
            autoRotationDoneRef.current = rotatedImage;
            addLog(`Image auto-rotated ${angleResult.angle}° for optimal OCR`, 'SUCCESS');
          } else if (angleResult.angle === 0) {
            addLog('No rotation correction needed', 'INFO');
          } else {
            addLog(
              `Low confidence (${(angleResult.confidence * 100).toFixed(0)}%) - skipping auto-rotation`,
              'WARN'
            );
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          addLog(`Auto-rotation failed: ${errorMsg}`, 'WARN');
        }
      }
    };

    runAutoRotation();
  }, [engine, autoRotateEnabled, previewUrl, addLog]);

  const processFileSelection = useCallback(
    async (file: File) => {
      setSelectedFile(file);
      setResult(null);
      clearLogs();
      setStatus(ExtractionStatus.IDLE);
      resetFilters();
      setViewState(DEFAULT_VIEW_STATE);
      setPreviewUrl(null);
      setProcessedImage(null);
      setViewMode('edit');
      setActiveLeftTab('editor');
      autoRotationDoneRef.current = null; // Reset auto-rotation tracking for new file

      const isHeic = isHeicFile(file);
      setIsHeic(isHeic);

      if (isHeic) {
        addLog(`File loaded: ${file.name} (${formatFileSize(file.size)})`, 'INFO');
        addLog('Format detected: HEIC. Converting to PNG for browser preview...', 'WARN');
        setIsConverting(true);

        try {
          // Convert HEIC to PNG for browser preview
          // Note: User can manually rotate using the rotation controls if needed
          const convertedBlob = (await heic2any({
            blob: file,
            toType: 'image/png',
            quality: 0.8,
          })) as Blob | Blob[];

          const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

          // Use Promise-based FileReader to avoid callback issues during render
          try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                if (e.target?.result) {
                  resolve(e.target.result as string);
                } else {
                  reject(new Error('Failed to read converted blob'));
                }
              };
              reader.onerror = () => reject(new Error('FileReader error'));
              reader.readAsDataURL(blob);
            });

            // Store the converted PNG as preview
            setPreviewUrl(dataUrl);
            setIsConverting(false);
            addLog('HEIC conversion complete. Preview and filters enabled.', 'SUCCESS');

            // Auto-detect rotation if enabled and using PaddleOCR
            if (autoRotateEnabled && engine === 'PADDLE') {
              addLog('Auto-detecting text orientation...', 'INFO');
              try {
                const angleResult = await detectRotationAngle(dataUrl, (_progress, status) => {
                  addLog(status, 'INFO');
                });

                if (angleResult.confidence > 0.5 && angleResult.angle !== 0) {
                  addLog(
                    `Detected rotation: ${angleResult.angle}° - auto-correcting...`,
                    'SUCCESS'
                  );
                  const rotatedImage = await rotateImage(dataUrl, angleResult.angle);
                  setPreviewUrl(rotatedImage);
                  addLog(`Image auto-rotated ${angleResult.angle}° for optimal OCR`, 'SUCCESS');
                } else if (angleResult.angle === 0) {
                  addLog('No rotation correction needed', 'INFO');
                } else {
                  addLog(
                    `Low confidence (${(angleResult.confidence * 100).toFixed(0)}%) - skipping auto-rotation`,
                    'WARN'
                  );
                }
              } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                addLog(`Auto-rotation failed: ${errorMsg}`, 'WARN');
              }
            }
          } catch (readError) {
            setIsConverting(false);
            addLog('Error reading converted HEIC blob.', 'ERROR');
          }
        } catch (error) {
          setIsConverting(false);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(error);
          addLog(`HEIC conversion failed: ${errorMessage}`, 'ERROR');
        }
      } else {
        // Use Promise-based FileReader for regular images too
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              if (e.target?.result) {
                resolve(e.target.result as string);
              } else {
                reject(new Error('Failed to read file'));
              }
            };
            reader.onerror = () => reject(new Error('FileReader error'));
            reader.readAsDataURL(file);
          });

          setPreviewUrl(dataUrl);
          addLog(`File loaded: ${file.name} (${formatFileSize(file.size)})`, 'INFO');
          addLog(`Format detected: ${getFileFormat(file)}`, 'INFO');

          // Auto-detect rotation if enabled and using PaddleOCR
          if (autoRotateEnabled && engine === 'PADDLE') {
            addLog('Auto-detecting text orientation...', 'INFO');
            try {
              const angleResult = await detectRotationAngle(dataUrl, (_progress, status) => {
                addLog(status, 'INFO');
              });

              if (angleResult.confidence > 0.5 && angleResult.angle !== 0) {
                addLog(`Detected rotation: ${angleResult.angle}° - auto-correcting...`, 'SUCCESS');
                const rotatedImage = await rotateImage(dataUrl, angleResult.angle);
                setPreviewUrl(rotatedImage);
                addLog(`Image auto-rotated ${angleResult.angle}° for optimal OCR`, 'SUCCESS');
              } else if (angleResult.angle === 0) {
                addLog('No rotation correction needed', 'INFO');
              } else {
                addLog(
                  `Low confidence (${(angleResult.confidence * 100).toFixed(0)}%) - skipping auto-rotation`,
                  'WARN'
                );
              }
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              addLog(`Auto-rotation failed: ${errorMsg}`, 'WARN');
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          addLog(`Failed to load file: ${errorMessage}`, 'ERROR');
        }
      }
    },
    [addLog, clearLogs, resetFilters]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        processFileSelection(e.target.files[0]);
      }
    },
    [processFileSelection]
  );

  const handleViewChange = useCallback((zoom: number, offset: { x: number; y: number }) => {
    setViewState({ zoom, offset });
  }, []);

  const handleCrop = useCallback(async () => {
    if (!imagePreviewRef.current) return;
    try {
      addLog('Cropping image to visible area...', 'INFO');
      const croppedImage = await imagePreviewRef.current.getCroppedImage();
      setPreviewUrl(croppedImage);
      resetFilters();
      setViewState(DEFAULT_VIEW_STATE);
      addLog('Image cropped successfully. Filters reset.', 'SUCCESS');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(error);
      addLog(`Failed to crop image: ${errorMessage}`, 'ERROR');
    }
  }, [addLog, resetFilters]);

  const handleManualRotationDetect = useCallback(async () => {
    if (!previewUrl) {
      addLog('No image loaded to detect rotation', 'WARN');
      return;
    }

    addLog('Manually triggering rotation detection...', 'INFO');
    try {
      const angleResult = await detectRotationAngle(previewUrl, (_progress, status) => {
        addLog(status, 'INFO');
      });

      if (angleResult.confidence > 0.5 && angleResult.angle !== 0) {
        addLog(`Detected rotation: ${angleResult.angle}° - applying correction...`, 'SUCCESS');
        const rotatedImage = await rotateImage(previewUrl, angleResult.angle);
        setPreviewUrl(rotatedImage);
        autoRotationDoneRef.current = rotatedImage;
        addLog(`Image rotated ${angleResult.angle}° for optimal OCR`, 'SUCCESS');
      } else if (angleResult.angle === 0) {
        addLog('No rotation correction needed', 'INFO');
      } else {
        addLog(
          `Low confidence (${(angleResult.confidence * 100).toFixed(0)}%) - skipping auto-rotation`,
          'WARN'
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      addLog(`Manual rotation detection failed: ${errorMsg}`, 'ERROR');
    }
  }, [previewUrl, addLog]);

  const handleProcess = useCallback(async () => {
    if (!selectedFile) return;
    if (!previewUrl && !isConverting && !isHeic) return;

    setActiveLeftTab('process');
    setStatus(ExtractionStatus.PROCESSING);
    addLog(
      engine === 'PADDLE'
        ? 'Initializing PaddleOCR container connection...'
        : 'Initializing Gemini Vision API...',
      'INFO'
    );

    await new Promise((r) => setTimeout(r, PROCESSING_DELAY));

    let payloadBase64: string | null = null;

    // For HEIC files, ALWAYS use the converted previewUrl (never raw HEIC)
    // For other files, use previewUrl if available, otherwise read the file
    if (previewUrl) {
      // We have a preview URL (either from HEIC conversion or regular image load)
      const hasTransform = filters.rotation !== 0 || filters.flipH || filters.flipV;

      if (hasTransform) {
        // User has applied transformations - process the image
        addLog('Applying transformations to image...', 'INFO');
        addLog(
          `Current filters: rotation=${filters.rotation}°, flipH=${filters.flipH}, flipV=${filters.flipV}`,
          'INFO'
        );

        try {
          const originalSize = Math.round(previewUrl.length / 1024);
          payloadBase64 = await generateProcessedImage(previewUrl, filters);
          const processedSize = Math.round(payloadBase64.length / 1024);

          // Verify the processed image is different from original
          if (payloadBase64 === previewUrl) {
            throw new Error('Processed image is identical to original despite transformations');
          }

          // Log transformation info
          if (filters.rotation !== 0) {
            addLog(`✅ Image rotated ${filters.rotation}° before OCR extraction`, 'SUCCESS');
          }
          if (filters.flipH || filters.flipV) {
            addLog(
              `✅ Image flipped (H:${filters.flipH}, V:${filters.flipV}) before OCR extraction`,
              'SUCCESS'
            );
          }

          addLog('Image transformations applied.', 'SUCCESS');
          addLog(`Processed image size: ${processedSize}KB (original: ${originalSize}KB)`, 'INFO');

          // Debug logging
          console.log('[DEBUG] Original image start:', previewUrl.substring(0, 100));
          console.log('[DEBUG] Processed image start:', payloadBase64.substring(0, 100));
          console.log('[DEBUG] Images are different:', payloadBase64 !== previewUrl);

          // Store full processed image for debugging
          (window as any).__processedImageForOCR = payloadBase64;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          addLog(`⚠️ Transformation failed: ${errorMessage}. Using original.`, 'ERROR');
          console.error('generateProcessedImage error:', error);
          // Fall back to original
          payloadBase64 = previewUrl;
        }
      } else {
        // No transformations - use preview directly
        addLog('Using preview image (no transformations applied).', 'INFO');
        payloadBase64 = previewUrl;
      }
    } else if (isHeic && !previewUrl) {
      // HEIC file without preview - conversion failed or still in progress
      addLog('❌ Cannot process HEIC file: preview not available.', 'ERROR');
      addLog('Please wait for HEIC conversion to complete before extracting.', 'ERROR');
      setStatus(ExtractionStatus.ERROR);
      return;
    } else {
      // No preview available for non-HEIC file - read the original file
      addLog('Reading original file...', 'INFO');
      try {
        const rawBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target?.result) {
              resolve(e.target.result as string);
            } else {
              reject(new Error('Failed to read file'));
            }
          };
          reader.onerror = () => reject(new Error('FileReader error'));
          reader.readAsDataURL(selectedFile);
        });

        const hasTransform = filters.rotation !== 0 || filters.flipH || filters.flipV;

        if (hasTransform) {
          // Apply rotation/filters to the raw file
          addLog(
            `Applying filters: rotation=${filters.rotation}°, flipH=${filters.flipH}, flipV=${filters.flipV}`,
            'INFO'
          );
          payloadBase64 = await generateProcessedImage(rawBase64, filters);

          if (filters.rotation !== 0) {
            addLog(`✅ Image rotated ${filters.rotation}° before OCR extraction`, 'SUCCESS');
          }
        } else {
          // No transformations - use raw file directly
          payloadBase64 = rawBase64;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        addLog(`Failed to read file: ${errorMessage}`, 'ERROR');
        setStatus(ExtractionStatus.ERROR);
        return;
      }
    }

    if (!payloadBase64) {
      addLog('No payload data available.', 'ERROR');
      setStatus(ExtractionStatus.ERROR);
      return;
    }

    setProcessedImage(payloadBase64);

    // Store the image being sent to OCR for debugging (accessible via browser console)
    (window as any).__sentToOCR = payloadBase64;

    try {
      const data = await performOCRExtraction(
        selectedFile,
        payloadBase64,
        (msg) => addLog(msg, 'INFO'),
        engine,
        () => {
          // Docker error callback - show setup helper
          if (engine === 'PADDLE') {
            setShowDockerSetup(true);
          }
        }
      );
      setResult(data);
      setStatus(ExtractionStatus.COMPLETE);
      addLog('Extraction successful. Text overlay available in Editor tab.', 'SUCCESS');
      setViewMode('text');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Show Docker setup helper for Docker-specific errors
      if (
        engine === 'PADDLE' &&
        (errorMessage === 'DOCKER_NOT_READY' || errorMessage === 'DOCKER_NOT_AVAILABLE')
      ) {
        setShowDockerSetup(true);
        setStatus(ExtractionStatus.ERROR);
        addLog(
          '⚠️ PaddleOCR container setup required. Click "Setup Docker" for instructions.',
          'ERROR'
        );
        return;
      }

      setStatus(ExtractionStatus.ERROR);
      addLog(`Error: ${errorMessage}`, 'ERROR');
    }
  }, [selectedFile, previewUrl, isConverting, isHeic, engine, filters, addLog, autoRotateEnabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processFileSelection(e.dataTransfer.files[0]);
      }
    },
    [processFileSelection]
  );

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setResult(null);
    clearLogs();
    setStatus(ExtractionStatus.IDLE);
    resetFilters();
    setViewState(DEFAULT_VIEW_STATE);
    setPreviewUrl(null);
    setProcessedImage(null);
    setEngine('GEMINI');
    setActiveLeftTab('source');
    setViewMode('edit');
  }, [clearLogs, resetFilters]);

  // Keyboard shortcuts
  const handleOpenFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleToggleHelp = useCallback(() => {
    setShowHelp(true);
  }, []);

  const shortcuts = useMemo(
    () => [
      {
        key: 'o',
        ctrl: true,
        callback: handleOpenFile,
        description: 'Open file',
      },
      {
        key: 'r',
        ctrl: true,
        callback: handleReset,
        description: 'Reset workspace',
      },
      {
        key: 'Enter',
        ctrl: true,
        callback: handleProcess,
        description: 'Start processing',
      },
      {
        key: '?',
        shift: true,
        callback: handleToggleHelp,
        description: 'Show help',
      },
    ],
    [handleOpenFile, handleReset, handleProcess, handleToggleHelp]
  );

  const shortcutsEnabled = useMemo(
    () => !isConverting && status !== ExtractionStatus.PROCESSING,
    [isConverting, status]
  );

  useKeyboardShortcuts(shortcuts, shortcutsEnabled);

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-300 selection:bg-emerald-500/30 overflow-x-hidden max-w-full">
      {/* Header */}
      <header className="h-14 border-b border-gray-800 bg-gray-950 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-emerald-600 rounded-md flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.4)]">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
          </div>
          <span className="font-bold tracking-tight text-gray-100">
            Docker<span className="text-emerald-400">OCR</span>
          </span>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-400">
          <button
            onClick={() => setShowHelp(true)}
            className="hover:text-emerald-400 transition-colors"
            title="Help & Shortcuts (Shift + ?)"
            aria-label="Show help"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
          <span
            className="flex items-center"
            title={apiKeyConfigured ? 'API Key Configured' : 'API Key Missing'}
          >
            <span
              className={`w-2 h-2 rounded-full mr-2 ${apiKeyConfigured ? 'bg-emerald-500' : 'bg-red-500'}`}
            ></span>
            {engine === 'GEMINI' ? 'Cloud API' : 'Docker Link'}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row p-2 lg:p-4 gap-4 w-full max-w-full">
        {/* Left Column: Tabbed Interface + Terminal */}
        <div className="w-full lg:w-1/2 flex flex-col bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden min-w-0 min-h-[600px] lg:min-h-0">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-800 bg-gray-900">
            <button
              onClick={() => setActiveLeftTab('source')}
              className={`flex-1 py-3 flex items-center justify-center space-x-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeLeftTab === 'source' ? 'text-emerald-400 bg-gray-800/50 border-b-2 border-emerald-500' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}
            >
              <IconTabImage />
              <span>Source</span>
            </button>
            <button
              onClick={() => setActiveLeftTab('editor')}
              disabled={!selectedFile}
              className={`flex-1 py-3 flex items-center justify-center space-x-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeLeftTab === 'editor' ? 'text-emerald-400 bg-gray-800/50 border-b-2 border-emerald-500' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'} ${!selectedFile ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <IconTabSliders />
              <span>Editor</span>
            </button>
            <button
              onClick={() => setActiveLeftTab('process')}
              className={`flex-1 py-3 flex items-center justify-center space-x-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeLeftTab === 'process' ? 'text-emerald-400 bg-gray-800/50 border-b-2 border-emerald-500' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}
            >
              <IconTabPlay />
              <span>Process</span>
            </button>
            <button
              onClick={handleReset}
              className="px-3 border-l border-gray-800 text-gray-500 hover:text-emerald-400 hover:bg-gray-800 transition-colors"
              title="Reset Workspace (Ctrl+R)"
              aria-label="Reset Workspace"
            >
              <IconRefresh />
            </button>
          </div>

          {/* Tab Content - takes up available space minus Terminal */}
          <div
            className="flex-1 p-4 overflow-y-auto relative min-h-0"
            style={{ maxHeight: 'calc(100% - 200px)' }}
          >
            {/* TAB: SOURCE */}
            {activeLeftTab === 'source' && (
              <div className="h-full flex flex-col space-y-4">
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={`
                    flex-1 rounded-xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center overflow-hidden group cursor-pointer
                    ${
                      selectedFile
                        ? 'border-emerald-500/50 bg-gray-900/50'
                        : 'border-gray-700 bg-gray-900 hover:bg-gray-850 hover:border-gray-600'
                    }
                  `}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/png, image/jpeg, image/jpg, image/heic, .heic, .png, .jpg, .jpeg"
                    aria-label="Upload image file"
                  />

                  {isConverting ? (
                    <LoadingSpinner message="Converting HEIC..." />
                  ) : previewUrl ? (
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                      <img
                        src={previewUrl}
                        alt="Source"
                        className="max-w-full max-h-full object-contain shadow-xl"
                      />
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        Original
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-6">
                      <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <IconUpload />
                      </div>
                      <h3 className="text-sm font-medium text-gray-300">Upload Image</h3>
                      <p className="text-xs text-gray-500 mt-1">Drag & Drop or Click to Browse</p>
                      <p className="text-[10px] text-gray-600 mt-4 uppercase tracking-widest">
                        PNG, JPG, HEIC
                      </p>
                    </div>
                  )}
                </div>

                {selectedFile && (
                  <div className="bg-gray-900 p-3 rounded-lg border border-gray-800 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gray-800 rounded text-emerald-500">
                        <IconFile />
                      </div>
                      <div>
                        <p
                          className="text-sm text-gray-200 truncate max-w-[200px]"
                          title={selectedFile.name}
                        >
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveLeftTab('editor')}
                      className="text-xs bg-emerald-900/30 text-emerald-400 px-3 py-1.5 rounded hover:bg-emerald-900/50 transition-colors border border-emerald-900/50"
                    >
                      Next: Edit
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB: EDITOR */}
            {activeLeftTab === 'editor' && (
              <div className="h-full flex flex-col space-y-4">
                {/* Editor Mode Toggle */}
                {processedImage && result && (
                  <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700 w-max mx-auto z-10 relative">
                    <button
                      onClick={() => setViewMode('edit')}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-bold uppercase transition-all ${viewMode === 'edit' ? 'bg-gray-700 text-emerald-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      <IconEdit />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setViewMode('text')}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-bold uppercase transition-all ${viewMode === 'text' ? 'bg-gray-700 text-emerald-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      <IconSelectText />
                      <span>Select Text</span>
                    </button>
                  </div>
                )}

                {/* Dynamic Preview / Text Overlay */}
                <div className="flex-1 bg-[#0B0F19] rounded-lg border border-gray-800 flex items-center justify-center overflow-hidden relative min-h-[200px]">
                  {viewMode === 'text' && processedImage && result ? (
                    <div className="w-full h-full flex justify-center items-start overflow-auto p-4">
                      <TextOverlay imageUrl={processedImage} blocks={result.blocks} />
                    </div>
                  ) : previewUrl ? (
                    <ImagePreview
                      ref={imagePreviewRef}
                      src={previewUrl}
                      filters={filters}
                      zoom={viewState.zoom}
                      offset={viewState.offset}
                      onViewChange={handleViewChange}
                    />
                  ) : (
                    <div className="text-gray-600 text-sm">No image loaded</div>
                  )}
                </div>

                {/* Controls (Hidden in Text Select Mode) */}
                {viewMode === 'edit' && (
                  <div className="h-1/2">
                    <ImageControls
                      filters={filters}
                      onChange={setFilters}
                      disabled={status === ExtractionStatus.PROCESSING}
                      onZoomIn={() =>
                        setViewState((prev) => ({ ...prev, zoom: Math.min(prev.zoom * 1.1, 5) }))
                      }
                      onZoomOut={() =>
                        setViewState((prev) => ({ ...prev, zoom: Math.max(prev.zoom * 0.9, 1) }))
                      }
                      onCrop={handleCrop}
                      autoRotateEnabled={autoRotateEnabled}
                      onAutoRotateChange={engine === 'PADDLE' ? setAutoRotateEnabled : undefined}
                      onManualRotationDetect={
                        engine === 'PADDLE' ? handleManualRotationDetect : undefined
                      }
                    />
                  </div>
                )}
                {viewMode === 'text' && (
                  <div className="h-10 flex items-center justify-center text-xs text-gray-500 italic">
                    Click and drag on the image to select extracted text.
                  </div>
                )}
              </div>
            )}

            {/* TAB: PROCESS */}
            {activeLeftTab === 'process' && (
              <div className="h-full flex flex-col space-y-4">
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                      OCR Engine
                    </label>
                    <select
                      value={engine}
                      onChange={(e) => setEngine(e.target.value as OCREngine)}
                      className="w-full bg-gray-800 text-gray-200 text-sm rounded-lg px-3 py-2.5 border border-gray-700 focus:border-emerald-500 outline-none transition-all"
                      disabled={status === ExtractionStatus.PROCESSING}
                    >
                      <option value="PADDLE">PaddleOCR (Local/Docker - No API Key)</option>
                      <option value="GEMINI">
                        Gemini Vision 2.5 (Cloud AI - Requires API Key)
                      </option>
                    </select>
                    <p className="text-[10px] text-gray-500 mt-2">
                      {engine === 'PADDLE'
                        ? 'Privacy-focused local processing. No API key required. Runs in Docker container.'
                        : 'High accuracy cloud AI. Best for handwriting and complex layouts. Requires Gemini API key.'}
                    </p>
                  </div>

                  {/* Docker Health Indicator - only show for PaddleOCR */}
                  {engine === 'PADDLE' && (
                    <DockerHealthIndicator onStatusChange={setIsDockerHealthy} />
                  )}

                  <button
                    disabled={
                      !selectedFile || status === ExtractionStatus.PROCESSING || isConverting
                    }
                    onClick={handleProcess}
                    className={`
                      w-full flex items-center justify-center space-x-2 px-6 py-3.5 rounded-lg font-bold text-sm transition-all uppercase tracking-wider
                      ${
                        !selectedFile || isConverting
                          ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                          : status === ExtractionStatus.PROCESSING
                            ? 'bg-emerald-900/20 text-emerald-500 border border-emerald-900/50 cursor-wait'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]'
                      }
                    `}
                  >
                    {status === ExtractionStatus.PROCESSING ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span>Extraction Running...</span>
                      </>
                    ) : (
                      <>
                        <IconTabPlay />
                        <span>Start Extraction</span>
                      </>
                    )}
                  </button>

                  {/* Docker Setup Button (only show for PaddleOCR) */}
                  {engine === 'PADDLE' && (
                    <button
                      onClick={() => setShowDockerSetup(true)}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-xs border border-gray-700 hover:border-blue-600 hover:bg-blue-900/20 text-gray-400 hover:text-blue-400 transition-all"
                    >
                      <span>🐳</span>
                      <span>Setup Docker</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Terminal - Always Visible */}
          <div className="h-[200px] border-t border-gray-800 bg-gray-950">
            <Terminal logs={logs} />
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="w-full lg:w-1/2 flex flex-col min-h-[500px] lg:min-h-0 min-w-0 overflow-hidden">
          <ResultsView data={result} />
        </div>
      </main>

      {/* Help Modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Docker Setup Helper */}
      {showDockerSetup && (
        <DockerSetupHelper onClose={() => setShowDockerSetup(false)} onRetry={handleProcess} />
      )}
    </div>
  );
};

export default App;
