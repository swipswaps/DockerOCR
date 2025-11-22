
import React, { useState, useCallback, useRef, useMemo } from 'react';
import { ExtractionStatus, OCRResult, OCREngine } from './types';
import { IconUpload, IconFile, IconTabImage, IconTabSliders, IconTabPlay, IconRefresh, IconSelectText, IconEdit } from './components/Icons';
import Terminal from './components/Terminal';
import ResultsView from './components/ResultsView';
import ImageControls from './components/ImageControls';
import TextOverlay from './components/TextOverlay';
import ImagePreview, { ImagePreviewRef } from './components/ImagePreview';
import LoadingSpinner from './components/LoadingSpinner';
import HelpModal from './components/HelpModal';
import DockerSetupHelper from './components/DockerSetupHelper';
import { performOCRExtraction } from './services/ocrService';
import { DEFAULT_VIEW_STATE, PROCESSING_DELAY } from './constants';
import { useImageFilters } from './hooks/useImageFilters';
import { useLogger } from './hooks/useLogger';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { generateProcessedImage, isHeicFile, formatFileSize, getFileFormat } from './utils/imageProcessing';
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
  const [engine, setEngine] = useState<OCREngine>('GEMINI');
  const [activeLeftTab, setActiveLeftTab] = useState<LeftTab>('source');
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [showHelp, setShowHelp] = useState(false);
  const [showDockerSetup, setShowDockerSetup] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagePreviewRef = useRef<ImagePreviewRef>(null);

  // Custom hooks - MUST be called unconditionally
  const { filters, setFilters, resetFilters } = useImageFilters();
  const { logs, addLog, clearLogs } = useLogger();

  // Check API key availability
  const apiKeyConfigured = useMemo(() => hasApiKey(), []);

  const processFileSelection = useCallback(async (file: File) => {
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

    const isHeic = isHeicFile(file);
    setIsHeic(isHeic);

    if (isHeic) {
      addLog(`File loaded: ${file.name} (${formatFileSize(file.size)})`, 'INFO');
      addLog('Format detected: HEIC. Converting to PNG for browser preview...', 'WARN');
      setIsConverting(true);

      try {
        const convertedBlob = await heic2any({
          blob: file,
          toType: "image/png",
          quality: 0.8
        }) as Blob | Blob[];

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

          // Batch state updates together
          setPreviewUrl(dataUrl);
          setIsConverting(false);
          addLog('HEIC conversion complete. Preview and filters enabled.', 'SUCCESS');
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
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        addLog(`Failed to load file: ${errorMessage}`, 'ERROR');
      }
    }
  }, [addLog, clearLogs, resetFilters]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFileSelection(e.target.files[0]);
    }
  }, [processFileSelection]);

  const handleViewChange = useCallback((zoom: number, offset: { x: number, y: number }) => {
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

    await new Promise(r => setTimeout(r, PROCESSING_DELAY));

    let payloadBase64 = previewUrl;

    if (previewUrl) {
      addLog('Optimizing image payload...', 'INFO');
      try {
        payloadBase64 = await generateProcessedImage(previewUrl, filters);

        // Log rotation info if image was rotated
        if (filters.rotation !== 0) {
          addLog(`✅ Image rotated ${filters.rotation}° before OCR extraction`, 'SUCCESS');
        }
        if (filters.flipH || filters.flipV) {
          addLog(`✅ Image flipped (H:${filters.flipH}, V:${filters.flipV}) before OCR extraction`, 'SUCCESS');
        }

        addLog('Image optimized for transmission.', 'SUCCESS');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        addLog(`Optimization failed: ${errorMessage}. Using original.`, 'WARN');
      }
    } else if (isHeic && !previewUrl) {
      addLog('Using raw HEIC file.', 'INFO');
      try {
        payloadBase64 = await new Promise<string>((resolve, reject) => {
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
      if (engine === 'PADDLE' && (errorMessage === 'DOCKER_NOT_READY' || errorMessage === 'DOCKER_NOT_AVAILABLE')) {
        setShowDockerSetup(true);
        setStatus(ExtractionStatus.ERROR);
        addLog('⚠️ PaddleOCR container setup required. Click "Setup Docker" for instructions.', 'ERROR');
        return;
      }

      setStatus(ExtractionStatus.ERROR);
      addLog(`Error: ${errorMessage}`, 'ERROR');
    }
  }, [selectedFile, previewUrl, isConverting, isHeic, engine, filters, addLog]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFileSelection(e.dataTransfer.files[0]);
    }
  }, [processFileSelection]);

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

  const shortcuts = useMemo(() => [
    {
      key: 'o',
      ctrl: true,
      callback: handleOpenFile,
      description: 'Open file'
    },
    {
      key: 'r',
      ctrl: true,
      callback: handleReset,
      description: 'Reset workspace'
    },
    {
      key: 'Enter',
      ctrl: true,
      callback: handleProcess,
      description: 'Start processing'
    },
    {
      key: '?',
      shift: true,
      callback: handleToggleHelp,
      description: 'Show help'
    }
  ], [handleOpenFile, handleReset, handleProcess, handleToggleHelp]);

  const shortcutsEnabled = useMemo(
    () => !isConverting && status !== ExtractionStatus.PROCESSING,
    [isConverting, status]
  );

  useKeyboardShortcuts(shortcuts, shortcutsEnabled);

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-300 selection:bg-emerald-500/30">
      {/* Header */}
      <header className="h-14 border-b border-gray-800 bg-gray-950 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-emerald-600 rounded-md flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.4)]">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <span className="font-bold tracking-tight text-gray-100">Docker<span className="text-emerald-400">OCR</span></span>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-400">
           <button
             onClick={() => setShowHelp(true)}
             className="hover:text-emerald-400 transition-colors"
             title="Help & Shortcuts (Shift + ?)"
             aria-label="Show help"
           >
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
           </button>
           <span className="flex items-center" title={apiKeyConfigured ? 'API Key Configured' : 'API Key Missing'}>
             <span className={`w-2 h-2 rounded-full mr-2 ${apiKeyConfigured ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
             {engine === 'GEMINI' ? 'Cloud API' : 'Docker Link'}
           </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden p-2 lg:p-4 gap-4">
        
        {/* Left Column: Tabbed Interface */}
        <div className="w-full lg:w-1/2 flex flex-col bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden shrink-0 min-h-[600px] lg:min-h-0">
          
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
              disabled={!selectedFile}
              className={`flex-1 py-3 flex items-center justify-center space-x-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeLeftTab === 'process' ? 'text-emerald-400 bg-gray-800/50 border-b-2 border-emerald-500' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'} ${!selectedFile ? 'opacity-50 cursor-not-allowed' : ''}`}
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

          {/* Tab Content */}
          <div className="flex-1 p-4 overflow-y-auto relative">
            
            {/* TAB: SOURCE */}
            {activeLeftTab === 'source' && (
              <div className="h-full flex flex-col space-y-4">
                <div 
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={`
                    flex-1 rounded-xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center overflow-hidden group cursor-pointer
                    ${selectedFile 
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
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">Original</div>
                    </div>
                  ) : (
                    <div className="text-center p-6">
                      <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <IconUpload />
                      </div>
                      <h3 className="text-sm font-medium text-gray-300">Upload Image</h3>
                      <p className="text-xs text-gray-500 mt-1">Drag & Drop or Click to Browse</p>
                      <p className="text-[10px] text-gray-600 mt-4 uppercase tracking-widest">PNG, JPG, HEIC</p>
                    </div>
                  )}
                </div>
                
                {selectedFile && (
                   <div className="bg-gray-900 p-3 rounded-lg border border-gray-800 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-800 rounded text-emerald-500"><IconFile /></div>
                        <div>
                          <p className="text-sm text-gray-200 truncate max-w-[200px]" title={selectedFile.name}>
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                        </div>
                      </div>
                      <button onClick={() => setActiveLeftTab('editor')} className="text-xs bg-emerald-900/30 text-emerald-400 px-3 py-1.5 rounded hover:bg-emerald-900/50 transition-colors border border-emerald-900/50">
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
                      onZoomIn={() => setViewState(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.1, 5) }))}
                      onZoomOut={() => setViewState(prev => ({ ...prev, zoom: Math.max(prev.zoom * 0.9, 1) }))}
                      onCrop={handleCrop}
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
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">OCR Engine</label>
                     <select 
                        value={engine}
                        onChange={(e) => setEngine(e.target.value as OCREngine)}
                        className="w-full bg-gray-800 text-gray-200 text-sm rounded-lg px-3 py-2.5 border border-gray-700 focus:border-emerald-500 outline-none transition-all"
                        disabled={status === ExtractionStatus.PROCESSING}
                      >
                        <option value="GEMINI">Gemini Vision 2.5 (Recommended)</option>
                        <option value="PADDLE">PaddleOCR (Docker/Local)</option>
                      </select>
                      <p className="text-[10px] text-gray-500 mt-2">
                        {engine === 'GEMINI' ? 'High accuracy cloud model. Best for handwriting and complex layouts.' : 'Runs in local Docker container. Best for privacy and speed on local network.'}
                      </p>
                  </div>

                  <button
                    disabled={!selectedFile || status === ExtractionStatus.PROCESSING || isConverting}
                    onClick={handleProcess}
                    className={`
                      w-full flex items-center justify-center space-x-2 px-6 py-3.5 rounded-lg font-bold text-sm transition-all uppercase tracking-wider
                      ${!selectedFile || isConverting
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

                <div className="flex-1 relative min-h-0">
                   <div className="absolute top-0 left-0 w-full h-full">
                      <Terminal logs={logs} />
                   </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right Column: Results */}
        <div className="w-full lg:w-1/2 flex flex-col min-h-[500px] lg:min-h-0">
          <ResultsView data={result} />
        </div>

      </main>

      {/* Help Modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Docker Setup Helper */}
      {showDockerSetup && (
        <DockerSetupHelper
          onClose={() => setShowDockerSetup(false)}
          onRetry={handleProcess}
        />
      )}
    </div>
  );
};

export default App;