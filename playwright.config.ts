import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/playwright',
  testMatch: /.*\.spec\.(t|j)sx?$/,
  timeout: 30_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    headless: true
  }
});
