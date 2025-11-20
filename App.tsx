import React, { useState, useCallback, useRef } from 'react';
import { ExtractionStatus, LogEntry, OCRResult, ImageFilters, OCREngine } from './types';
import { IconUpload, IconTerminal, IconCheck, IconFile, IconTabImage, IconTabSliders, IconTabPlay, IconRefresh } from './components/Icons';
import Terminal from './components/Terminal';
import ResultsView from './components/ResultsView';
import ImageControls from './components/ImageControls';
import { performOCRExtraction } from './services/ocrService';
// @ts-ignore
import heic2any from 'heic2any';

const DEFAULT_FILTERS: ImageFilters = {
  contrast: 100,
  brightness: 100,
  grayscale: 0,
  rotation: 0,
  flipH: false,
  flipV: false,
  invert: false,
};

type LeftTab = 'source' | 'editor' | 'process';

const App: React.FC = () => {
  const [status, setStatus] = useState<ExtractionStatus>(ExtractionStatus.IDLE);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [filters, setFilters] = useState<ImageFilters>(DEFAULT_FILTERS);
  const [isHeic, setIsHeic] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [engine, setEngine] = useState<OCREngine>('GEMINI');
  const [activeLeftTab, setActiveLeftTab] = useState<LeftTab>('source');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = useCallback((message: string, level: LogEntry['level'] = 'INFO') => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString().split('T')[1].split('.')[0],
      level,
      message
    }]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFileSelection(e.target.files[0]);
    }
  };

  const processFileSelection = async (file: File) => {
    setSelectedFile(file);
    setResult(null);
    setLogs([]);
    setStatus(ExtractionStatus.IDLE);
    setFilters(DEFAULT_FILTERS);
    setPreviewUrl(null);
    setActiveLeftTab('editor'); // Auto-switch to editor
    
    const isHeicFile = file.name.toLowerCase().endsWith('.heic');
    setIsHeic(isHeicFile);

    if (isHeicFile) {
      addLog(`File loaded: ${file.name}`, 'INFO');
      addLog('Format detected: HEIC. Converting to PNG for browser preview...', 'WARN');
      setIsConverting(true);

      try {
        const convertedBlob = await heic2any({
          blob: file,
          toType: "image/png",
          quality: 0.8
        });

        const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrl(e.target?.result as string);
          setIsConverting(false);
          addLog('HEIC conversion complete. Preview and filters enabled.', 'SUCCESS');
        };
        reader.onerror = () => {
          setIsConverting(false);
          addLog('Error reading converted HEIC blob.', 'ERROR');
        }
        reader.readAsDataURL(blob);
      } catch (error: any) {
        setIsConverting(false);
        console.error(error);
        addLog(`HEIC conversion failed: ${error.message || 'Unknown error'}`, 'ERROR');
      }
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
        addLog(`File loaded: ${file.name}`, 'INFO');
        addLog(`Format detected: ${file.type.split('/')[1]?.toUpperCase() || 'UNKNOWN'}`, 'INFO');
      };
      reader.readAsDataURL(file);
    }
  };

  // Canvas processing for payload (Rotation, Flip, Filters)
  const generateProcessedImage = async (originalBase64: string, currentFilters: ImageFilters): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate scaling to limit max dimension to 1500px to avoid API 500 errors
        const maxDim = 1500;
        let scale = 1;
        if (img.width > maxDim || img.height > maxDim) {
          scale = maxDim / Math.max(img.width, img.height);
        }

        const width = img.width * scale;
        const height = img.height * scale;

        // Determine canvas size based on rotation
        if (currentFilters.rotation % 180 !== 0) {
          canvas.width = height;
          canvas.height = width;
        } else {
          canvas.width = width;
          canvas.height = height;
        }

        if (ctx) {
          ctx.save();
          
          // 1. Apply Filter
          ctx.filter = `contrast(${currentFilters.contrast}%) brightness(${currentFilters.brightness}%) grayscale(${currentFilters.grayscale}%) invert(${currentFilters.invert ? 100 : 0}%)`;

          // 2. Center canvas context
          ctx.translate(canvas.width / 2, canvas.height / 2);
          
          // 3. Rotate
          ctx.rotate((currentFilters.rotation * Math.PI) / 180);
          
          // 4. Flip
          ctx.scale(currentFilters.flipH ? -1 : 1, currentFilters.flipV ? -1 : 1);

          // 5. Draw Image (centered relative to rotation)
          // We draw using the scaled dimensions
          ctx.drawImage(img, -width / 2, -height / 2, width, height);
          
          ctx.restore();
          
          // Reduce quality to 0.7 to aggressively prevent payload size errors with Gemini
          resolve(canvas.toDataURL('image/jpeg', 0.70));
        } else {
          resolve(originalBase64);
        }
      };
      img.onerror = () => resolve(originalBase64);
      img.src = originalBase64;
    });
  };

  const handleProcess = async () => {
    if (!selectedFile) return;
    if (!previewUrl && !isConverting && !isHeic) return;

    // If user is in Editor or Source tab, switch to Process tab to show logs
    setActiveLeftTab('process');

    setStatus(ExtractionStatus.PROCESSING);
    addLog(engine === 'PADDLE' ? 'Initializing PaddleOCR container connection...' : 'Initializing Gemini Vision API...', 'INFO');
    
    await new Promise(r => setTimeout(r, 500));

    let payloadBase64 = previewUrl;
    
    // Check if any modifications exist OR if we need to downscale for API stability
    // Always running generateProcessedImage ensures we get the downscaled/optimized version
    if (previewUrl) {
        addLog('Optimizing image payload...', 'INFO');
        try {
          payloadBase64 = await generateProcessedImage(previewUrl, filters);
          addLog('Image optimized for transmission.', 'SUCCESS');
        } catch (e) {
          addLog('Optimization failed, using original.', 'WARN');
        }
    } else if (isHeic && !previewUrl) {
         // HEIC fallback logic if conversion failed but we have file
         addLog('Using raw HEIC file.', 'INFO');
         try {
           payloadBase64 = await new Promise<string>((resolve, reject) => {
             const reader = new FileReader();
             reader.onload = (e) => resolve(e.target?.result as string);
             reader.onerror = reject;
             reader.readAsDataURL(selectedFile);
           });
        } catch (e) {
           addLog('Failed to read file.', 'ERROR');
           setStatus(ExtractionStatus.ERROR);
           return;
        }
    }

    if (!payloadBase64) {
      addLog('No payload data.', 'ERROR');
      setStatus(ExtractionStatus.ERROR);
      return;
    }

    try {
      const data = await performOCRExtraction(selectedFile, payloadBase64, (msg) => addLog(msg, 'INFO'), engine);
      setResult(data);
      setStatus(ExtractionStatus.COMPLETE);
      addLog('Extraction successful.', 'SUCCESS');
    } catch (error: any) {
      setStatus(ExtractionStatus.ERROR);
      addLog(`Error: ${error.message}`, 'ERROR');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFileSelection(e.dataTransfer.files[0]);
    }
  };

  // CSS Transform for real-time preview (much faster than canvas for display)
  const previewStyle = {
    filter: `contrast(${filters.contrast}%) brightness(${filters.brightness}%) grayscale(${filters.grayscale}%) invert(${filters.invert ? 100 : 0}%)`,
    transform: `rotate(${filters.rotation}deg) scaleX(${filters.flipH ? -1 : 1}) scaleY(${filters.flipV ? -1 : 1})`
  };

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
           <span className="flex items-center">
             <span className={`w-2 h-2 rounded-full mr-2 ${process.env.API_KEY ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
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
              onClick={() => {
                setSelectedFile(null);
                setResult(null);
                setLogs([]);
                setStatus(ExtractionStatus.IDLE);
                setFilters(DEFAULT_FILTERS);
                setPreviewUrl(null);
                setEngine('GEMINI');
                setActiveLeftTab('source');
              }}
              className="px-3 border-l border-gray-800 text-gray-500 hover:text-emerald-400 hover:bg-gray-800 transition-colors"
              title="Reset Workspace"
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
                    accept="image/png, image/jpeg, image/heic, .heic"
                  />
                  
                  {isConverting ? (
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-emerald-400 text-sm font-mono animate-pulse">Converting HEIC...</p>
                      </div>
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
                          <p className="text-sm text-gray-200 truncate max-w-[200px]">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
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
                {/* Dynamic Preview */}
                <div className="flex-1 bg-[#0B0F19] rounded-lg border border-gray-800 flex items-center justify-center overflow-hidden relative min-h-[200px]">
                   {previewUrl ? (
                      <img 
                        src={previewUrl} 
                        alt="Preview" 
                        className="max-w-full max-h-full object-contain transition-all duration-200" 
                        style={previewStyle}
                      />
                   ) : (
                     <div className="text-gray-600 text-sm">No image loaded</div>
                   )}
                </div>
                {/* Controls */}
                <div className="h-1/2">
                  <ImageControls 
                    filters={filters} 
                    onChange={setFilters} 
                    disabled={status === ExtractionStatus.PROCESSING} 
                  />
                </div>
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
                        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        <span>Extraction Running...</span>
                      </>
                    ) : (
                      <>
                        <IconTabPlay />
                        <span>Start Extraction</span>
                      </>
                    )}
                  </button>
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
    </div>
  );
};

export default App;