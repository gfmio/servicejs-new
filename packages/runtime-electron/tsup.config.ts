import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'], // Electron supports both ESM and CJS
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node18',
  platform: 'node',
});
