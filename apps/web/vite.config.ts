import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
// Explicit extension: Vite's native config loader (its future default) runs this file without a bundler.
import { API, DEV_SERVER } from './src/constants.ts';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const apiProxyTarget = env[DEV_SERVER.API_PROXY_TARGET_ENV] ?? DEV_SERVER.DEFAULT_API_PROXY_TARGET;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Same-origin in development: the anonymous-session cookie just works, no CORS.
      proxy: {
        [API.BASE_PATH]: apiProxyTarget,
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
  };
});
