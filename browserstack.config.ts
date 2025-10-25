/**
 * BrowserStack Configuration for ServiceJS Browser Runtime E2E Tests
 *
 * This configuration is shared across all browser-based runtime packages:
 * - runtime-browser
 * - runtime-web-worker
 * - runtime-shared-worker
 * - runtime-service-worker
 *
 * Environment Variables Required:
 * - BROWSERSTACK_USERNAME: Your BrowserStack username
 * - BROWSERSTACK_ACCESS_KEY: Your BrowserStack access key
 */

export interface BrowserStackConfig {
  user: string;
  key: string;
  commonCapabilities: {
    'browserstack.debug': boolean;
    'browserstack.networkLogs': boolean;
    'browserstack.console': 'verbose' | 'errors' | 'warnings' | 'info' | 'disable';
    'browserstack.local': boolean;
    project: string;
    build: string;
  };
  browsers: BrowserConfig[];
}

export interface BrowserConfig {
  browserName: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  deviceName?: string;
  realMobile?: boolean;
}

// Get BrowserStack credentials from environment
const getBrowserStackCredentials = () => {
  const user = process.env.BROWSERSTACK_USERNAME;
  const key = process.env.BROWSERSTACK_ACCESS_KEY;

  if (!user || !key) {
    throw new Error(
      'BrowserStack credentials not found. Please set BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY environment variables.'
    );
  }

  return { user, key };
};

// Build name with timestamp
const getBuildName = () => {
  const date = new Date().toISOString().split('T')[0];
  const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
  const branch = process.env.GITHUB_REF_NAME || process.env.GIT_BRANCH || 'local';
  return `ServiceJS E2E - ${branch} - ${date} ${time}`;
};

/**
 * Desktop Browser Configurations
 */
export const desktopBrowsers: BrowserConfig[] = [
  // Chrome - Latest + Previous
  { browserName: 'Chrome', browserVersion: 'latest', os: 'Windows', osVersion: '11' },
  { browserName: 'Chrome', browserVersion: 'latest-1', os: 'OS X', osVersion: 'Monterey' },

  // Firefox - Latest + Previous
  { browserName: 'Firefox', browserVersion: 'latest', os: 'Windows', osVersion: '11' },
  { browserName: 'Firefox', browserVersion: 'latest-1', os: 'OS X', osVersion: 'Monterey' },

  // Safari - Latest + Previous
  { browserName: 'Safari', browserVersion: 'latest', os: 'OS X', osVersion: 'Ventura' },
  { browserName: 'Safari', browserVersion: 'latest-1', os: 'OS X', osVersion: 'Monterey' },

  // Edge - Latest
  { browserName: 'Edge', browserVersion: 'latest', os: 'Windows', osVersion: '11' },
];

/**
 * Mobile Browser Configurations (for testing web workers on mobile)
 */
export const mobileBrowsers: BrowserConfig[] = [
  // iOS Safari
  { browserName: 'Safari', deviceName: 'iPhone 14', realMobile: true, os: 'ios', osVersion: '16' },
  { browserName: 'Safari', deviceName: 'iPhone 13', realMobile: true, os: 'ios', osVersion: '15' },
  { browserName: 'Safari', deviceName: 'iPad Pro 12.9 2022', realMobile: true, os: 'ios', osVersion: '16' },

  // Android Chrome
  { browserName: 'Chrome', deviceName: 'Google Pixel 7', realMobile: true, os: 'android', osVersion: '13.0' },
  { browserName: 'Chrome', deviceName: 'Samsung Galaxy S22', realMobile: true, os: 'android', osVersion: '12.0' },
];

/**
 * Get BrowserStack configuration
 */
export const getBrowserStackConfig = (options: {
  project?: string;
  includeDesktop?: boolean;
  includeMobile?: boolean;
  browsers?: BrowserConfig[];
} = {}): BrowserStackConfig => {
  const {
    project = 'ServiceJS Runtime Tests',
    includeDesktop = true,
    includeMobile = false,
    browsers,
  } = options;

  const credentials = getBrowserStackCredentials();

  // Select browsers
  let selectedBrowsers: BrowserConfig[] = [];
  if (browsers) {
    selectedBrowsers = browsers;
  } else {
    if (includeDesktop) selectedBrowsers.push(...desktopBrowsers);
    if (includeMobile) selectedBrowsers.push(...mobileBrowsers);
  }

  return {
    user: credentials.user,
    key: credentials.key,
    commonCapabilities: {
      'browserstack.debug': true,
      'browserstack.networkLogs': true,
      'browserstack.console': 'verbose',
      'browserstack.local': true, // Enable local testing
      project,
      build: getBuildName(),
    },
    browsers: selectedBrowsers,
  };
};

/**
 * Get Playwright BrowserStack capabilities
 */
export const getPlaywrightBrowserStackCapabilities = (browserConfig: BrowserConfig) => {
  return {
    browser: browserConfig.browserName.toLowerCase(),
    browser_version: browserConfig.browserVersion || 'latest',
    os: browserConfig.os,
    os_version: browserConfig.osVersion,
    device: browserConfig.deviceName,
    real_mobile: browserConfig.realMobile,
  };
};

/**
 * Get WebDriver BrowserStack capabilities
 */
export const getWebDriverCapabilities = (browserConfig: BrowserConfig, commonCaps: any) => {
  return {
    ...commonCaps,
    browserName: browserConfig.browserName,
    browserVersion: browserConfig.browserVersion,
    'bstack:options': {
      os: browserConfig.os,
      osVersion: browserConfig.osVersion,
      deviceName: browserConfig.deviceName,
      realMobile: browserConfig.realMobile,
      local: true,
      debug: true,
      networkLogs: true,
      consoleLogs: 'verbose',
    },
  };
};

export default getBrowserStackConfig;
