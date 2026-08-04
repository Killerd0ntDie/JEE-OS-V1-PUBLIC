import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@/engines': path.resolve(__dirname, './src'),
      '@jee-os/engines': path.resolve(__dirname, './src'),
      '@': path.resolve(__dirname, '../../src')
    },
  },
  test: {
    env: {
      VITE_USE_FIREBASE_EMULATOR: 'true'
    }
  }
});
