import React, { useState, useCallback, useRef } from 'react';
import { ExtractionStatus, LogEntry, OCRResult } from './types';
import { IconUpload, IconTerminal, IconCheck, IconFile } from './components/Icons';
import Terminal from './components/Terminal';
import ResultsView from './components/ResultsView';
import { performOCRExtraction } from './services/ocrService';

const App: React.FC = () => {
  const [status, setStatus] = useState<ExtractionStatus>(ExtractionStatus.IDLE);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<OCRResult | null>(null);
  
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

  const processFileSelection = (file: File) => {
    setSelectedFile(file);
    setResult(null);
    setLogs([]);
    setStatus(ExtractionStatus.IDLE);
    
    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
      addLog(`File loaded: ${file.name}`, 'INFO');
      
      // Mock log for HEIC detection to simulated docker environment capability
      if (file.name.toLowerCase().endsWith('.heic')) {
        addLog('Format detected: HEIC. Utilizing ImageMagick/libheif for normalization...', 'WARN');
      } else {
        addLog(`Format detected: ${file.type.split('/')[1]?.toUpperCase() || 'UNKNOWN'}`, 'INFO');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProcess = async () => {
    if (!selectedFile || !previewUrl) return;

    setStatus(ExtractionStatus.PROCESSING);
    addLog('Initializing Docker container environment...', 'INFO');
    
    // Simulate Docker startup time
    await new Promise(r => setTimeout(r, 600));
    addLog('Container started: paddle-ocr-v2.4', 'SUCCESS');
    addLog(`Processing ${selectedFile.name} via /app/process.sh...`, 'INFO');

    try {
      // Perform actual AI extraction using Gemini as the backend engine
      const data = await performOCRExtraction(selectedFile, previewUrl, (msg) => addLog(msg, 'INFO'));
      
      setResult(data);
      setStatus(ExtractionStatus.COMPLETE);
      addLog('Output written to /app/output/result.json', 'SUCCESS');
      addLog('Task finished successfully.', 'SUCCESS');
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
          <span className="px-2 py-0.5 text-[10px] font-mono bg-gray-800 rounded text-gray-400 border border-gray-700">v2.1.0-stable</span>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-400">
           <span className="flex items-center">
             <span className={`w-2 h-2 rounded-full mr-2 ${process.env.API_KEY ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
             API Status
           </span>
           <a href="#" className="hover:text-emerald-400 transition-colors">Documentation</a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden p-4 space-x-4">
        
        {/* Left Column: Input & Visuals */}
        <div className="w-1/2 flex flex-col space-y-4">
          
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
            
            {previewUrl ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black/40">
                <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60"></div>
                
                {/* Change File Overlay */}
                <div className="absolute bottom-4 right-4">
                   <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-1.5 rounded-lg border border-gray-700 shadow-lg transition-all"
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

          {/* Control Panel */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-800 rounded-lg text-gray-400">
                <IconFile />
              </div>
              <div>
                 <p className="text-sm font-medium text-gray-200">
                   {selectedFile ? selectedFile.name : 'No file selected'}
                 </p>
                 <p className="text-xs text-gray-500">
                   {selectedFile ? `${(selectedFile.size / 1024).toFixed(2)} KB` : 'Waiting for input...'}
                 </p>
              </div>
            </div>
            <button
              disabled={!selectedFile || status === ExtractionStatus.PROCESSING}
              onClick={handleProcess}
              className={`
                flex items-center space-x-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all
                ${!selectedFile 
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
          <div className="flex-1 min-h-0 relative">
             <div className="absolute top-2 right-2 z-10 opacity-50">
               <IconTerminal />
             </div>
            <Terminal logs={logs} />
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="w-1/2 flex flex-col min-h-0">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center">
            Extraction Output
            {status === ExtractionStatus.COMPLETE && (
              <span className="ml-2 flex items-center text-emerald-500 normal-case tracking-normal text-[10px] bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-900/50">
                <IconCheck />
                <span className="ml-1">Complete</span>
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