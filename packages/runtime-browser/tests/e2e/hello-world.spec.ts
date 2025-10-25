/**
 * E2E tests for runtime-browser hello-world app
 * Runs in Playwright (local or BrowserStack)
 */
import { test, expect } from '@playwright/test';

test.describe('Hello World App', () => {
  test('should load and display hello world message', async ({ page }) => {
    // Navigate to the app
    await page.goto('/hello-world.html');

    // Wait for the app to bootstrap
    await page.waitForSelector('#app', { state: 'visible' });

    // Check for hello world message
    const heading = await page.textContent('h1');
    expect(heading).toContain('Hello from ServiceJS');

    // Verify platform is shown
    const platform = await page.textContent('#platform');
    expect(platform).toContain('browser');
  });

  test('should display current timestamp', async ({ page }) => {
    await page.goto('/hello-world.html');
    await page.waitForSelector('#timestamp', { state: 'visible' });

    const timestamp = await page.textContent('#timestamp');
    expect(timestamp).toMatch(/\d+/);

    // Timestamp should be a recent number
    const ts = parseInt(timestamp || '0');
    const now = Date.now();
    expect(ts).toBeGreaterThan(now - 60000); // Within last minute
    expect(ts).toBeLessThanOrEqual(now);
  });

  test('should generate valid UUID', async ({ page }) => {
    await page.goto('/hello-world.html');
    await page.waitForSelector('#uuid', { state: 'visible' });

    const uuid = await page.textContent('#uuid');
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  test('should access environment capabilities', async ({ page }) => {
    await page.goto('/hello-world.html');

    // Check if environment info is displayed
    const envSection = await page.textContent('#environment');
    expect(envSection).toBeTruthy();
  });

  test('should use console capability', async ({ page }) => {
    const consoleMessages: string[] = [];

    // Listen for console messages
    page.on('console', (msg) => {
      consoleMessages.push(msg.text());
    });

    await page.goto('/hello-world.html');
    await page.waitForTimeout(1000); // Wait for console logs

    // Should have logged something
    expect(consoleMessages.length).toBeGreaterThan(0);
    expect(consoleMessages.some((msg) => msg.includes('Hello'))).toBe(true);
  });

  test('should handle high-resolution time', async ({ page }) => {
    await page.goto('/hello-world.html');

    const hrTimeElement = await page.locator('#hr-time');
    await expect(hrTimeElement).toBeVisible();

    const hrTime = await hrTimeElement.textContent();
    expect(hrTime).toMatch(/\d+\.\d+/); // Should be a decimal number
  });

  test('should work across different browsers', async ({ page, browserName }) => {
    await page.goto('/hello-world.html');

    // Basic smoke test that should work in all browsers
    await expect(page.locator('#app')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();

    // Log which browser we're testing
    console.log(`✓ Test passed on ${browserName}`);
  });
});

test.describe('Browser-specific features', () => {
  test('should access window dimensions', async ({ page }) => {
    await page.goto('/hello-world.html');
    await page.waitForSelector('#window-dimensions', { state: 'visible' });

    const dimensions = await page.textContent('#window-dimensions');
    expect(dimensions).toMatch(/\d+x\d+/); // Should be like "1920x1080"
  });

  test('should detect device pixel ratio', async ({ page }) => {
    await page.goto('/hello-world.html');
    await page.waitForSelector('#device-pixel-ratio', { state: 'visible' });

    const dpr = await page.textContent('#device-pixel-ratio');
    const dprValue = parseFloat(dpr || '0');
    expect(dprValue).toBeGreaterThan(0);
    expect(dprValue).toBeLessThanOrEqual(3); // Reasonable range
  });

  test('should access localStorage', async ({ page }) => {
    await page.goto('/hello-world.html');

    // Test localStorage capability
    await page.evaluate(() => {
      localStorage.setItem('test-key', 'test-value');
    });

    const value = await page.evaluate(() => {
      return localStorage.getItem('test-key');
    });

    expect(value).toBe('test-value');

    // Cleanup
    await page.evaluate(() => {
      localStorage.removeItem('test-key');
    });
  });
});

test.describe('Cross-browser compatibility', () => {
  test('should support Web Crypto API', async ({ page }) => {
    await page.goto('/hello-world.html');

    const hasCrypto = await page.evaluate(() => {
      return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function';
    });

    expect(hasCrypto).toBe(true);
  });

  test('should support fetch API', async ({ page }) => {
    await page.goto('/hello-world.html');

    const hasFetch = await page.evaluate(() => {
      return typeof fetch === 'function';
    });

    expect(hasFetch).toBe(true);
  });

  test('should support performance.now()', async ({ page }) => {
    await page.goto('/hello-world.html');

    const hasPerformanceNow = await page.evaluate(() => {
      return typeof performance !== 'undefined' && typeof performance.now === 'function';
    });

    expect(hasPerformanceNow).toBe(true);
  });
});
