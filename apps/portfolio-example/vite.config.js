import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // One copy of each renderer-level dependency across the workspace.
  resolve: { dedupe: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei'] },
});
