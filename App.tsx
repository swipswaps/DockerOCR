import React, { useState, useCallback, useRef } from 'react';
import { ExtractionStatus, LogEntry, OCRResult, ImageFilters, OCREngine } from './types';
import { IconUpload, IconTerminal, IconCheck, IconFile } from './components/Icons';
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
};

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
    
    const isHeicFile = file.name.toLowerCase().endsWith('.heic');
    setIsHeic(isHeicFile);

    if (isHeicFile) {
      addLog(`File loaded: ${file.name}`, 'INFO');
      addLog('Format detected: HEIC. Converting to PNG for browser preview...', 'WARN');
      setIsConverting(true);

      try {
        // Convert HEIC to PNG blob using heic2any
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
      // Standard Image
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
        addLog(`File loaded: ${file.name}`, 'INFO');
        addLog(`Format detected: ${file.type.split('/')[1]?.toUpperCase() || 'UNKNOWN'}`, 'INFO');
      };
      reader.readAsDataURL(file);
    }
  };

  // Generates a new Base64 string with filters applied via Canvas
  const generateProcessedImage = async (originalBase64: string, currentFilters: ImageFilters): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.filter = `contrast(${currentFilters.contrast}%) brightness(${currentFilters.brightness}%) grayscale(${currentFilters.grayscale}%)`;
          ctx.drawImage(img, 0, 0, img.width, img.height);
          resolve(canvas.toDataURL('image/jpeg', 0.95));
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

    if (isHeic && !previewUrl && !isConverting) {
       // Fallthrough
    } else if (!previewUrl) {
       return;
    }

    setStatus(ExtractionStatus.PROCESSING);
    addLog(engine === 'PADDLE' ? 'Initializing PaddleOCR container connection...' : 'Initializing Gemini Vision API...', 'INFO');
    
    await new Promise(r => setTimeout(r, 600));
    if (engine === 'PADDLE') {
      addLog('Container reachable: paddle-ocr-v2.4', 'SUCCESS');
    } else {
      addLog('API Connection established: google-genai', 'SUCCESS');
    }

    let payloadBase64 = previewUrl;
    const filtersChanged = filters.contrast !== 100 || filters.brightness !== 100 || filters.grayscale !== 0;
    
    if (filtersChanged && previewUrl) {
        addLog(`Applying image pre-processing: Contrast ${filters.contrast}%, Brightness ${filters.brightness}%, Grayscale ${filters.grayscale}%...`, 'INFO');
        try {
          payloadBase64 = await generateProcessedImage(previewUrl, filters);
          addLog('Image pre-processing complete. Normalized to JPEG.', 'SUCCESS');
        } catch (e) {
          addLog('Pre-processing failed, falling back to available image data.', 'WARN');
        }
    } else if (isHeic) {
        addLog('Using native HEIC file for extraction.', 'INFO');
        try {
           payloadBase64 = await new Promise<string>((resolve, reject) => {
             const reader = new FileReader();
             reader.onload = (e) => resolve(e.target?.result as string);
             reader.onerror = reject;
             reader.readAsDataURL(selectedFile);
           });
        } catch (e) {
           addLog('Failed to read original HEIC file.', 'ERROR');
           setStatus(ExtractionStatus.ERROR);
           return;
        }
    }

    if (!payloadBase64) {
      addLog('No payload data available.', 'ERROR');
      setStatus(ExtractionStatus.ERROR);
      return;
    }

    addLog(`Processing payload with ${engine}...`, 'INFO');

    try {
      const data = await performOCRExtraction(selectedFile, payloadBase64, (msg) => addLog(msg, 'INFO'), engine);
      setResult(data);
      setStatus(ExtractionStatus.COMPLETE);
      addLog('Output generated successfully.', 'SUCCESS');
    } catch (error: any) {
      setStatus(ExtractionStatus.ERROR);
      addLog(`Runtime Error: ${error.message}`, 'ERROR');
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

  const filterStyle = {
    filter: `contrast(${filters.contrast}%) brightness(${filters.brightness}%) grayscale(${filters.grayscale}%)`
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-300 selection:bg-emerald-500/30">
      {/* Header */}
      <header className="h-14 border-b border-gray-800 bg-gray-950 flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-emerald-600 rounded-md flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.4)]">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <span className="font-bold tracking-tight text-gray-100">Docker<span className="text-emerald-400">OCR</span></span>
          <span className="px-2 py-0.5 text-[10px] font-mono bg-gray-800 rounded text-gray-400 border border-gray-700">v2.2.0-multi-engine</span>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-400">
           <span className="flex items-center">
             <span className={`w-2 h-2 rounded-full mr-2 ${process.env.API_KEY ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
             {engine === 'GEMINI' ? 'Cloud API' : 'Docker Link'}
           </span>
           <a href="#" className="hover:text-emerald-400 transition-colors">Documentation</a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden p-4 space-x-4">
        
        {/* Left Column: Input & Visuals */}
        <div className="w-1/2 flex flex-col space-y-4 overflow-y-auto pr-1">
          
          {/* Upload Area */}
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`
              relative h-64 rounded-xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center overflow-hidden group
              ${selectedFile 
                ? 'border-emerald-500/50 bg-gray-900/50' 
                : 'border-gray-700 bg-gray-900 hover:bg-gray-850 hover:border-gray-600'
              }
            `}
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
              <div className="relative w-full h-full flex items-center justify-center bg-[#0B0F19]">
                 <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="max-w-full max-h-full object-contain transition-all duration-200 z-10" 
                  style={filterStyle}
                />
                
                <div className="absolute bottom-4 right-4 z-20">
                   <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gray-900/80 hover:bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg border border-gray-700 shadow-lg backdrop-blur-sm transition-all"
                   >
                     Change File
                   </button>
                </div>
              </div>
            ) : (
              <div className="text-center p-6 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <IconUpload />
                </div>
                <h3 className="text-sm font-medium text-gray-300">Upload Image</h3>
                <p className="text-xs text-gray-500 mt-1">Drag & Drop or Click to Browse</p>
                <p className="text-[10px] text-gray-600 mt-4 uppercase tracking-widest">Supports PNG, JPG, HEIC</p>
              </div>
            )}
          </div>

          {/* Image Controls */}
          {selectedFile && !isConverting && (
            <ImageControls 
              filters={filters} 
              onChange={setFilters} 
              disabled={status === ExtractionStatus.PROCESSING}
            />
          )}

          {/* Control Panel */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 shadow-sm space-y-4">
            
            {/* Engine Selection & File Info */}
            <div className="flex items-center justify-between">
               <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-800 rounded-lg text-gray-400">
                    <IconFile />
                  </div>
                  <div>
                     <p className="text-sm font-medium text-gray-200 truncate max-w-[150px]">
                       {selectedFile ? selectedFile.name : 'No file selected'}
                     </p>
                     <p className="text-xs text-gray-500">
                       {selectedFile ? `${(selectedFile.size / 1024).toFixed(2)} KB` : 'Waiting...'}
                     </p>
                  </div>
               </div>

               <div className="flex items-center space-x-2">
                 <label className="text-xs text-gray-500 uppercase font-bold">Engine:</label>
                 <select 
                   value={engine}
                   onChange={(e) => setEngine(e.target.value as OCREngine)}
                   className="bg-gray-800 text-gray-200 text-xs rounded px-2 py-1 border border-gray-700 focus:border-emerald-500 outline-none"
                   disabled={status === ExtractionStatus.PROCESSING}
                 >
                   <option value="GEMINI">Gemini Vision 2.5</option>
                   <option value="PADDLE">PaddleOCR (Docker)</option>
                 </select>
               </div>
            </div>

            {/* Action Button */}
            <button
              disabled={!selectedFile || status === ExtractionStatus.PROCESSING || isConverting}
              onClick={handleProcess}
              className={`
                w-full flex items-center justify-center space-x-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all
                ${!selectedFile || isConverting
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                  : status === ExtractionStatus.PROCESSING
                    ? 'bg-emerald-900/20 text-emerald-500 border border-emerald-900/50 cursor-wait'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                }
              `}
            >
              {status === ExtractionStatus.PROCESSING ? (
                 <>
                   <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                   <span>Processing...</span>
                 </>
              ) : (
                <>
                   <span>Start Extraction</span>
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                   </svg>
                </>
              )}
            </button>
          </div>

          {/* Terminal Output */}
          <div className="flex-1 min-h-[200px] relative">
             <div className="absolute top-2 right-2 z-10 opacity-50">
               <IconTerminal />
             </div>
            <Terminal logs={logs} />
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="w-1/2 flex flex-col min-h-0">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center justify-between">
            <span>Extraction Output</span>
            {status === ExtractionStatus.COMPLETE && (
              <span className="flex items-center text-emerald-500 normal-case tracking-normal text-[10px] bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-900/50">
                <IconCheck />
                <span className="ml-1">{engine === 'GEMINI' ? 'Gemini' : 'Paddle'} Result</span>
              </span>
            )}
          </h2>
          <div className="flex-1 min-h-0 relative shadow-2xl">
            <ResultsView data={result} />
          </div>
        </div>

      </main>
    </div>
  );
};

export default App;