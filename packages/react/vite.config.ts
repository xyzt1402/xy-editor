/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

const dirname = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    projects: [
      // ── Unit & component tests ────────────────────────────────────────
      {
        test: {
          name: 'unit',
          include: [
            'src/**/*.test.ts',
            'src/**/*.test.tsx',
          ],
          exclude: [
            'src/**/*.stories.tsx',
            '**/node_modules/**',
            'src/**/*.stories.mdx',
          ],
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./src/test/setup.ts'],
        },
      },


      // ── Storybook interaction tests ───────────────────────────────────
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          include: [
            'src/**/*.stories.tsx',
            'src/**/*.stories.mdx',
          ],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: ['.storybook/vitest.setup.ts']
        },
      },
    ],
  },
});