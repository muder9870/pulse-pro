import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vitest Configuration
 * 
 * Optimized for both local development and CI environments:
 * - CI mode: Single run, longer timeouts, coverage enabled
 * - Local mode: Watch mode, faster feedback
 * - React support with proper JSX transformation
 * - Path aliases for clean imports
 */

const isCI = process.env.CI === 'true';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    // CI vs local settings
    watch: !isCI,
    reporters: isCI ? ['verbose', 'junit'] : ['verbose'],
    outputFile: isCI ? {
      junit: './test-results/junit.xml',
    } : undefined,
    // Increased timeouts for CI stability
    testTimeout: isCI ? 30000 : 10000,
    hookTimeout: isCI ? 15000 : 5000,
    teardownTimeout: isCI ? 10000 : 5000,
    // Retry flaky tests in CI
    retry: isCI ? 2 : 0,
    // Pool settings for consistent execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: isCI, // Single thread in CI for consistency
        maxThreads: isCI ? 1 : undefined,
        minThreads: isCI ? 1 : undefined,
      },
    },
    // Isolate tests to prevent cross-test contamination
    isolate: true,
    // Coverage settings
    coverage: {
      provider: 'v8',
      reporter: isCI ? ['text', 'json', 'html', 'lcov'] : ['text', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.config.js',
        '**/*.config.ts',
        'dist/',
        'coverage/',
        '**/*.d.ts',
        '**/__mocks__/**',
      ],
      thresholds: isCI ? {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      } : undefined,
    },
    include: [
      'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
    ],
    exclude: [
      'node_modules/',
      'dist/',
      '**/*.config.js',
      '**/*.config.ts',
      'e2e/**',
      '**/*.e2e.{js,jsx,ts,tsx}',
      'src/test/components.test.jsx',
    ],
    // Environment variables for test consistency
    env: {
      NODE_ENV: 'test',
      CI: process.env.CI || 'false',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@test': path.resolve(__dirname, './src/test'),
    },
  },
  // Build optimization for test environment
  build: {
    target: 'esnext',
    minify: false,
  },
});
