import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Production builds are served from GitHub Pages at the root of https://spjz.uk/
// (the spjz/spjz.github.io user site), so assets resolve under '/'. BASE_PATH
// overrides it (e.g. '/some-path/' for a sub-path deploy). `vite preview` serves
// the build the same way; the dev server always uses '/'.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? (process.env.BASE_PATH ?? '/') : '/',
  plugins: [react()],
  // One copy of each renderer-level dependency across the workspace.
  resolve: { dedupe: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei'] },
}));
