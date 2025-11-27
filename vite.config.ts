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
    const base = mode === 'production'
      ? '/DockerOCR/'  // GitHub Pages: https://swipswaps.github.io/DockerOCR/
      : '/';

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
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
