import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:3001' },
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: ['cactusjoe', 'localhost', '127.0.0.1', '100.69.182.120'],
  },
});
