import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { APP_VERSION } from './constants';

// Self-healing cache verification - MUST run before React renders
// This tells the HTML script that the correct JS bundle loaded
declare global {
  interface Window {
    __DOCKEROCR_VERIFY_VERSION__?: (version: string) => void;
  }
}

// Verify immediately
console.log('[DockerOCR] JS bundle loaded. Version:', APP_VERSION);
if (typeof window !== 'undefined' && window.__DOCKEROCR_VERIFY_VERSION__) {
  window.__DOCKEROCR_VERIFY_VERSION__(APP_VERSION);
  console.log('[DockerOCR] ✅ Version verified with HTML');
} else {
  console.log('[DockerOCR] Running in dev mode (no cache verification)');
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);