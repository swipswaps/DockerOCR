import React, { useState } from 'react';
import { OCRResult } from '../types';
import { IconCopy, IconCSV, IconDatabase, IconTable } from './Icons';
// @ts-ignore
import * as XLSX from 'xlsx';

interface ResultsViewProps {
  data: OCRResult | null;
}

type TabType = 'json' | 'text' | 'csv' | 'xlsx' | 'sql';

const ResultsView: React.FC<ResultsViewProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<TabType>('json');

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-gray-900 rounded-lg border border-gray-800 border-dashed">
        <p className="mb-2">No data extracted yet</p>
        <p className="text-xs text-gray-600">Upload an image to begin analysis</p>
      </div>
    );
  }

  const generateCSV = (result: OCRResult) => {
    const headers = ['Text', 'Confidence', 'BBox_X1', 'BBox_Y1', 'BBox_X2', 'BBox_Y2', 'BBox_X3', 'BBox_Y3', 'BBox_X4', 'BBox_Y4'];
    const rows = result.blocks.map(b => {
      // Flatten bounding box coords for CSV compatibility
      const flatBBox = b.bbox.flat();
      const safeText = `"${b.text.replace(/"/g, '""')}"`; // Escape quotes
      return [safeText, b.confidence.toFixed(4), ...flatBBox.map(n => n.toString())].join(',');
    });
    return [headers.join(','), ...rows].join('\n');
  };

  const generateSQL = (result: OCRResult) => {
    const tableName = 'ocr_extraction_results';
    const statements = result.blocks.map(b => {
      const safeText = b.text.replace(/'/g, "''"); // Escape single quotes for SQL
      const safeFile = result.file.replace(/'/g, "''");
      return `INSERT INTO ${tableName} (file_name, detected_text, confidence, captured_at) VALUES ('${safeFile}', '${safeText}', ${b.confidence}, NOW());`;
    });
    
    return [
      `CREATE TABLE IF NOT EXISTS ${tableName} (`,
      `  id INT AUTO_INCREMENT PRIMARY KEY,`,
      `  file_name VARCHAR(255),`,
      `  detected_text TEXT,`,
      `  confidence FLOAT,`,
      `  captured_at DATETIME`,
      `);`,
      '',
      ...statements
    ].join('\n');
  };

  const getDisplayContent = () => {
    switch (activeTab) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'text':
        return data.text;
      case 'csv':
        return generateCSV(data);
      case 'sql':
        return generateSQL(data);
      default:
        return ''; // XLSX is handled separately in render
    }
  };

  const handleCopy = () => {
    const content = getDisplayContent();
    if (activeTab === 'xlsx') {
      // Logic for copying XLSX table data if needed, usually better to copy visually
      // For now, we just copy the text representation of the table or CSV as fallback
      navigator.clipboard.writeText(generateCSV(data));
    } else {
      navigator.clipboard.writeText(content);
    }
  };

  const downloadXLSX = () => {
    const ws = XLSX.utils.json_to_sheet(data.blocks.map(b => ({
      Text: b.text,
      Confidence: b.confidence,
      // Convert array of arrays to string for Excel cell
      BoundingBox: JSON.stringify(b.bbox)
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "OCR Data");
    XLSX.writeFile(wb, `${data.file.split('.')[0]}_ocr_data.xlsx`);
  };

  const renderTabButton = (type: TabType, label: string, Icon?: React.FC) => (
    <button
      onClick={() => setActiveTab(type)}
      className={`flex items-center space-x-1.5 text-xs font-mono uppercase tracking-wider py-2 px-3 border-b-2 transition-colors ${
        activeTab === type 
          ? 'border-emerald-500 text-emerald-400 bg-gray-800/30' 
          : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/20'
      }`}
    >
      {Icon && <Icon />}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      <div className="flex items-center justify-between px-2 bg-gray-850 border-b border-gray-800 overflow-x-auto no-scrollbar">
        <div className="flex">
          {renderTabButton('json', 'JSON')}
          {renderTabButton('text', 'Text')}
          {renderTabButton('csv', 'CSV', IconCSV)}
          {renderTabButton('xlsx', 'XLSX', IconTable)}
          {renderTabButton('sql', 'SQL', IconDatabase)}
        </div>
        <div className="flex items-center pl-2 border-l border-gray-800 ml-2 py-1">
           {activeTab === 'xlsx' ? (
             <button 
                onClick={downloadXLSX}
                className="p-1.5 hover:bg-gray-700 rounded transition-colors text-emerald-400 text-xs font-bold flex items-center space-x-1"
                title="Download .xlsx File"
             >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
               </svg>
               <span>Export</span>
             </button>
           ) : (
            <button 
              onClick={handleCopy}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors text-gray-400"
              title="Copy to Clipboard"
            >
              <IconCopy />
            </button>
           )}
        </div>
      </div>

      <div className="relative flex-1 overflow-auto bg-[#0B0F19]">
        {activeTab === 'xlsx' ? (
          <div className="p-4">
            <div className="overflow-x-auto border border-gray-800 rounded-lg">
              <table className="min-w-full divide-y divide-gray-800">
                <thead className="bg-gray-900">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Text</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Confidence</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Coordinates (BBox)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 bg-[#0e121a]">
                  {data.blocks.map((block, idx) => (
                    <tr key={idx} className="hover:bg-gray-900/50 transition-colors">
                      <td className="px-6 py-4 whitespace-pre-wrap text-sm text-gray-300 font-mono">{block.text}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-400 font-mono">
                        {(block.confidence * 100).toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                        {JSON.stringify(block.bbox)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-center">
              <button 
                onClick={downloadXLSX}
                className="text-xs text-emerald-500 hover:text-emerald-400 hover:underline"
              >
                Download Full Excel Spreadsheet
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 h-full">
             {activeTab === 'json' ? (
               <pre className="font-mono text-xs text-emerald-300/90 whitespace-pre-wrap">
                 {getDisplayContent()}
               </pre>
             ) : (
               <pre className="font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                 {getDisplayContent()}
               </pre>
             )}
          </div>
        )}
      </div>
      
      <div className="bg-gray-850 px-4 py-1 border-t border-gray-800 flex justify-between text-[10px] uppercase tracking-wider text-gray-500">
        <span>Blocks: {data.blocks.length}</span>
        <span>Avg Conf: {(data.blocks.reduce((acc, b) => acc + b.confidence, 0) / (data.blocks.length || 1) * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
};

export default ResultsView;