import * as path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Declare process to avoid TypeScript errors in the Vite config (Node environment)
declare const process: any;

export default defineConfig(({ mode }) => {
    // Load env file based on `mode` in the current working directory.
    const env = loadEnv(mode, process.cwd(), '');
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Polyfill process.env.API_KEY for the Gemini SDK
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
        // Note: We do NOT overwrite 'process.env' entirely here to preserve NODE_ENV
      },
      resolve: {
        alias: {
          '@': path.resolve(process.cwd()),
        }
      }
    };
});