import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: '/Vesserith/',
  publicDir: 'assets-public',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 4180,
    strictPort: true,
    // macOS preview sessions can miss atomic-write filesystem events.
    watch: { usePolling: true, interval: 300 },
  },
  build: { outDir: 'dist' },
});
