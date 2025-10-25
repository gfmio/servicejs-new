import { defineConfig, devices } from '@playwright/test';
import { getBrowserStackConfig, getPlaywrightBrowserStackCapabilities } from '../../browserstack.config';

/**
 * Playwright Configuration for runtime-browser E2E Tests
 *
 * Supports both local and BrowserStack testing:
 * - Local: npm test
 * - BrowserStack: BROWSERSTACK=true npm test
 */

const useBrowserStack = process.env.BROWSERSTACK === 'true';

let config: any = {
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run test:server',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
};

if (useBrowserStack) {
  console.log('🌐 Running tests on BrowserStack...');

  const bsConfig = getBrowserStackConfig({
    project: 'ServiceJS - runtime-browser',
    includeDesktop: true,
    includeMobile: process.env.BROWSERSTACK_MOBILE === 'true',
  });

  // BrowserStack specific configuration
  config = {
    ...config,
    use: {
      ...config.use,
      connectOptions: {
        wsEndpoint: `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(
          JSON.stringify({
            'browserstack.username': bsConfig.user,
            'browserstack.accessKey': bsConfig.key,
            ...bsConfig.commonCapabilities,
          })
        )}`,
      },
    },
    projects: bsConfig.browsers.map((browser) => ({
      name: `${browser.browserName} ${browser.browserVersion || 'latest'} - ${browser.os} ${browser.osVersion}`,
      use: {
        ...devices['Desktop Chrome'], // Base settings
        ...getPlaywrightBrowserStackCapabilities(browser),
      },
    })),
  };
} else {
  console.log('💻 Running tests locally...');

  // Local browser testing
  config.projects = [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile viewports for local testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ];
}

export default defineConfig(config);
