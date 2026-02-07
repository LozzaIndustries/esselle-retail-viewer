import * as path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Handle process type definition for Node environment within Vite config
declare const process: { cwd: () => string; env: Record<string, string | undefined> };

export default defineConfig(({ mode }) => {
    const currentWorkingDir = process.cwd();
    const env = loadEnv(mode, currentWorkingDir, '');
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(currentWorkingDir),
        }
      }
    };
});