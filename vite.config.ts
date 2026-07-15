/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static SPA — output goes to dist/ and is synced to S3 behind CloudFront.
export default defineConfig({
  plugins: [react()],
  build: {
    // Keep the bundle small for Pi hardware; warn early if it grows.
    chunkSizeWarningLimit: 600,
    target: 'es2020',
  },
  test: {
    // Pure-logic suite (formatting + view-model derivation) plus the kiosk
    // installer, which shells out for real. No DOM needed.
    environment: 'node',
    include: ['src/**/*.test.ts', 'kiosk/**/*.test.ts'],
  },
});
