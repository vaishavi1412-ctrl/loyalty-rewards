import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development ("npm run dev:client") API calls are forwarded to the Express server.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
});
