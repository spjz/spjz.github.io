import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Production builds are served from GitHub Pages at https://spjz.github.io/resume/,
// a sub-path, so assets resolve under /resume/. BASE_PATH overrides it (e.g. '/'
// for a custom domain). `vite preview` serves the build the same way; the dev
// server always uses '/'.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? (process.env.BASE_PATH ?? '/resume/') : '/',
  plugins: [react()],
  // One copy of each renderer-level dependency across the workspace.
  resolve: { dedupe: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei'] },
}));
