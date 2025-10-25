# BrowserStack E2E Testing Guide

This guide explains how to run ServiceJS browser runtime E2E tests on BrowserStack for comprehensive cross-browser testing.

## What is BrowserStack?

BrowserStack is a cloud-based testing platform that provides access to real browsers and devices for testing web applications. ServiceJS uses BrowserStack to test browser-based runtime packages across multiple browsers, versions, and operating systems.

## Covered Runtime Packages

- **runtime-browser** - Main browser thread
- **runtime-web-worker** - Web Workers (dedicated workers)
- **runtime-shared-worker** - Shared Workers (cross-tab communication)
- **runtime-service-worker** - Service Workers (offline/PWA)

## Setup

### 1. Get BrowserStack Credentials

1. Sign up for BrowserStack at [browserstack.com](https://www.browserstack.com)
2. Get your username and access key from the [Account Settings](https://www.browserstack.com/accounts/settings)

### 2. Set Environment Variables

```bash
# Add to your ~/.bashrc, ~/.zshrc, or CI environment
export BROWSERSTACK_USERNAME="your-username"
export BROWSERSTACK_ACCESS_KEY="your-access-key"
```

Or create a `.env` file in the project root:
```env
BROWSERSTACK_USERNAME=your-username
BROWSERSTACK_ACCESS_KEY=your-access-key
```

### 3. Install Dependencies

```bash
# Install Playwright (already in package.json)
cd packages/runtime-browser
bun install

# Install Playwright browsers (for local testing)
bunx playwright install
```

## Running Tests

### Local Testing (Default)

Test on your local machine with Chromium, Firefox, and WebKit:

```bash
cd packages/runtime-browser
bun test
```

This runs tests using local Playwright browsers.

### BrowserStack Testing

Test on real browsers via BrowserStack:

```bash
cd packages/runtime-browser

# Run on BrowserStack desktop browsers
BROWSERSTACK=true bun test

# Run on BrowserStack desktop + mobile browsers
BROWSERSTACK=true BROWSERSTACK_MOBILE=true bun test
```

### Other Browser Packages

```bash
# Web Worker
cd packages/runtime-web-worker
BROWSERSTACK=true bun test

# Shared Worker
cd packages/runtime-shared-worker
BROWSERSTACK=true bun test

# Service Worker
cd packages/runtime-service-worker
BROWSERSTACK=true bun test
```

## Browser Matrix

### Desktop Browsers (Default)

When running with `BROWSERSTACK=true`:

| Browser | Version | OS | OS Version |
|---------|---------|----|-----------  |
| Chrome | latest | Windows | 11 |
| Chrome | latest-1 | macOS | Monterey |
| Firefox | latest | Windows | 11 |
| Firefox | latest-1 | macOS | Monterey |
| Safari | latest | macOS | Ventura |
| Safari | latest-1 | macOS | Monterey |
| Edge | latest | Windows | 11 |

**Total: 7 browser configurations**

### Mobile Browsers (Optional)

When running with `BROWSERSTACK_MOBILE=true`:

| Browser | Device | OS | Version |
|---------|--------|----|---------|
| Safari | iPhone 14 | iOS | 16 |
| Safari | iPhone 13 | iOS | 15 |
| Safari | iPad Pro 12.9 2022 | iOS | 16 |
| Chrome | Google Pixel 7 | Android | 13.0 |
| Chrome | Samsung Galaxy S22 | Android | 12.0 |

**Total: 5 mobile configurations**

## Configuration Files

### `browserstack.config.ts` (Root)

Central configuration for all browser packages:

```typescript
import { getBrowserStackConfig } from '../../browserstack.config';

const config = getBrowserStackConfig({
  project: 'ServiceJS - runtime-browser',
  includeDesktop: true,
  includeMobile: process.env.BROWSERSTACK_MOBILE === 'true',
});
```

### `playwright.config.ts` (Per Package)

Each browser package has its own Playwright config that uses the shared BrowserStack config.

## Test Features

### What's Tested

All E2E tests verify:

✅ **Core Capabilities**
- Environment detection
- Console logging
- Time operations
- Crypto (UUID, random bytes)
- HTTP fetch

✅ **Browser-Specific Features**
- Window dimensions
- Device pixel ratio
- localStorage/sessionStorage (where available)
- Web Crypto API
- Performance API

✅ **Cross-Browser Compatibility**
- Feature detection
- Polyfill requirements
- Browser-specific quirks

### Test Files

Each package has E2E tests in `tests/e2e/*.spec.ts`:

```
packages/runtime-browser/tests/e2e/
├── hello-world.spec.ts      # Basic bootstrap tests
├── storage.spec.ts           # localStorage/sessionStorage
├── worker-communication.spec.ts (for workers)
└── apps/
    ├── hello-world.html      # Test application
    └── todo-app.html         # Comprehensive test app
```

## Viewing Test Results

### BrowserStack Dashboard

1. Go to [BrowserStack Automate](https://automate.browserstack.com/)
2. Find your test run (organized by build name)
3. View:
   - Screenshots
   - Console logs
   - Network logs
   - Video recordings
   - Test duration

### Local Reports

Playwright generates HTML reports locally:

```bash
# After running tests
bunx playwright show-report
```

## Debugging

### Debug Mode

Run tests in debug mode with Playwright Inspector:

```bash
cd packages/runtime-browser
bun test:debug
```

### UI Mode

Interactive test running:

```bash
bun test:ui
```

### BrowserStack Local Testing

For testing local development servers on BrowserStack:

```bash
# Download BrowserStack Local binary
npm install -g browserstack-local

# Start local tunnel
browserstack-local --key $BROWSERSTACK_ACCESS_KEY

# Run tests (they'll use the tunnel automatically)
BROWSERSTACK=true bun test
```

The `browserstack.local: true` setting in the config enables this automatically.

## CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests on BrowserStack

on: [push, pull_request]

jobs:
  e2e-browserstack:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run Browser E2E Tests on BrowserStack
        env:
          BROWSERSTACK_USERNAME: ${{ secrets.BROWSERSTACK_USERNAME }}
          BROWSERSTACK_ACCESS_KEY: ${{ secrets.BROWSERSTACK_ACCESS_KEY }}
        run: |
          cd packages/runtime-browser
          BROWSERSTACK=true bun test

      - name: Upload Playwright Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: packages/runtime-browser/playwright-report/
```

### Required Secrets

Add to GitHub Repository Settings > Secrets:
- `BROWSERSTACK_USERNAME`
- `BROWSERSTACK_ACCESS_KEY`

## Customizing Browser Matrix

### Edit `browserstack.config.ts`

Add or remove browsers:

```typescript
export const desktopBrowsers: BrowserConfig[] = [
  // Add new browser
  { browserName: 'Opera', browserVersion: 'latest', os: 'Windows', osVersion: '11' },

  // Remove by commenting out
  // { browserName: 'Edge', ... },
];
```

### Override in Playwright Config

Test specific browsers only:

```typescript
const config = getBrowserStackConfig({
  browsers: [
    { browserName: 'Chrome', browserVersion: 'latest', os: 'Windows', osVersion: '11' },
    { browserName: 'Safari', browserVersion: 'latest', os: 'OS X', osVersion: 'Ventura' },
  ],
});
```

## Best Practices

### 1. Test Organization

```typescript
test.describe('Feature Name', () => {
  test('should work in all browsers', async ({ page, browserName }) => {
    // Test implementation
    console.log(`Testing on ${browserName}`);
  });
});
```

### 2. Browser-Specific Tests

```typescript
test('safari-specific feature', async ({ page, browserName }) => {
  test.skip(browserName !== 'webkit', 'Safari only');
  // Safari-specific test
});
```

### 3. Mobile Detection

```typescript
test('mobile layout', async ({ page, viewport }) => {
  test.skip(!viewport || viewport.width > 768, 'Mobile only');
  // Mobile test
});
```

### 4. Timeouts

Increase timeouts for BrowserStack (network latency):

```typescript
test('slow operation', async ({ page }) => {
  await page.goto('/', { timeout: 60000 }); // 60 seconds
});
```

### 5. Screenshots on Failure

```typescript
test('important feature', async ({ page }) => {
  try {
    // Test code
  } catch (error) {
    await page.screenshot({ path: 'failure.png', fullPage: true });
    throw error;
  }
});
```

## Troubleshooting

### Issue: "BrowserStack credentials not found"

**Solution:** Set environment variables:
```bash
export BROWSERSTACK_USERNAME="your-username"
export BROWSERSTACK_ACCESS_KEY="your-access-key"
```

### Issue: "Connection timeout"

**Solution:**
- Check BrowserStack status page
- Increase test timeout
- Verify internet connection

### Issue: "Test fails on BrowserStack but passes locally"

**Solution:**
- Check console logs in BrowserStack dashboard
- Verify browser-specific features
- Add longer wait times for network latency
- Check for timing-dependent code

### Issue: "Too many parallel sessions"

**Solution:** Reduce `workers` in playwright.config.ts:
```typescript
workers: process.env.CI ? 1 : undefined,
```

### Issue: "Local testing not working"

**Solution:**
- Ensure `browserstack-local` is running
- Verify `browserstack.local: true` in config
- Check firewall settings

## Cost Optimization

### Parallel Testing

BrowserStack charges per parallel session. Optimize:

```typescript
// playwright.config.ts
workers: process.env.CI ? 1 : 2, // Limit parallel tests
```

### Selective Testing

Test critical browsers in PR checks, full matrix on main:

```typescript
const browsers = process.env.FULL_MATRIX
  ? desktopBrowsers // All browsers
  : [desktopBrowsers[0], desktopBrowsers[4]]; // Chrome + Safari only
```

### Session Duration

Keep tests fast:
- Use `test.setTimeout()`
- Skip unnecessary waits
- Parallelize independent tests

## Support

### BrowserStack Support
- [Documentation](https://www.browserstack.com/docs)
- [Support](https://www.browserstack.com/support)
- [Status Page](https://status.browserstack.com/)

### ServiceJS Support
- [GitHub Issues](https://github.com/your-org/servicejs/issues)
- [Testing Guide](./TESTING_AND_EXAMPLES_GUIDE.md)
- [Implementation Summary](./TEST_AND_EXAMPLES_IMPLEMENTATION_SUMMARY.md)

## Next Steps

1. **Set up credentials**: Add BrowserStack username and access key
2. **Run local tests**: `bun test` in any browser package
3. **Run BrowserStack tests**: `BROWSERSTACK=true bun test`
4. **Review results**: Check BrowserStack dashboard
5. **Add to CI**: Use GitHub Actions workflow above
6. **Customize matrix**: Edit `browserstack.config.ts` as needed

---

**Happy Testing!** 🎉

With BrowserStack, you can confidently test ServiceJS across all major browsers and devices, ensuring compatibility and reliability for your users.
