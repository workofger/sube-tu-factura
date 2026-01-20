import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env variables with VITE_ prefix
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    }
  };
});
