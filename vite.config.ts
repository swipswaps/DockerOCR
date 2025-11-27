import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Generate build version for cache busting
const BUILD_VERSION = `2.0.0-${Date.now().toString(36)}`;
const BUILD_TIMESTAMP = new Date().toISOString();

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // Use repository name as base for GitHub Pages
  // Set to '/' for local development
  const base = mode === 'production' ? '/DockerOCR/' : '/';

  return {
    base,
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      // Plugin to inject build version into HTML for cache busting
      {
        name: 'inject-build-version',
        transformIndexHtml(html) {
          return html
            .replace('__BUILD_VERSION__', BUILD_VERSION)
            .replace('__BUILD_TIMESTAMP__', BUILD_TIMESTAMP);
        },
      },
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Optimize chunk splitting for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            // React core - changes infrequently
            'vendor-react': ['react', 'react-dom'],
            // OCR engine - large, rarely changes
            'vendor-tesseract': ['tesseract.js'],
            // Excel export - medium size, rarely changes
            'vendor-excel': ['exceljs'],
            // Google GenAI - API client
            'vendor-genai': ['@google/genai'],
            // Image processing utilities
            'vendor-image': ['heic2any', 'exifr'],
          },
        },
      },
      // Increase warning limit since we're splitting chunks
      chunkSizeWarningLimit: 1000,
      // Enable source maps for production debugging
      sourcemap: false,
      // Minification settings
      minify: 'esbuild',
      target: 'es2020',
    },
  };
});
