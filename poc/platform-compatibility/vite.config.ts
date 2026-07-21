import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// POC only. Build target documents the modern baseline the candidate stack assumes
// (Tailwind v4 floor = Chrome 111 / Safari 16.4 / Firefox 128). The diagnostics panel
// probes CSS.supports() at runtime so we can observe where a webview falls below this.
export default defineConfig({
  root: '.',
  plugins: [react(), tailwindcss()],
  build: {
    target: ['chrome111', 'edge111', 'firefox128', 'safari16.4'],
    outDir: 'dist',
    sourcemap: false,
  },
  server: { port: 5175, strictPort: true },
});
