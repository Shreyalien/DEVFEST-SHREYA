import { defineConfig } from '@playwright/test';
const port = process.env.TEST_PORT || '5173';
export default defineConfig({ testDir: './tests', timeout: 60000, use: { baseURL: `http://127.0.0.1:${port}`, launchOptions: { ...(process.env.TEST_BROWSER_PATH ? { executablePath: process.env.TEST_BROWSER_PATH } : {}), ...(process.env.TEST_DOWNLOADS_PATH ? {downloadsPath:process.env.TEST_DOWNLOADS_PATH} : {}) } }, webServer: { command: `npm run dev -- --port ${port} --strictPort`, url: `http://127.0.0.1:${port}`, reuseExistingServer: true }, reporter: 'list' });
