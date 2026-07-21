import { defineConfig } from 'vitest/config';

// Unit tests only: pure logic (contrast math, fullscreen state reducer). No DOM env needed.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
});
