/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// base: GitHub Pages project 경로 (T015). https://shaul1991.github.io/md2htmlreview/
export default defineConfig({
  base: '/md2htmlreview/',
  test: {
    // parse/export/notes 는 DOM 비종속 순수 모듈 → node 환경
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
