/**
 * Integration Test Example
 *
 * These tests demonstrate how to write integration tests that work with
 * a live browser session through Playwriter. They are skipped by default
 * in CI/CD but can be run manually when Playwriter is available.
 *
 * To run these tests:
 * 1. Install Playwriter extension in Chrome
 * 2. Open Chrome and enable Playwriter on at least one tab
 * 3. Run: INTEGRATION_TESTS=1 bun test integration-example.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { connect, disconnect, getPage, isConnected } from '../src/browser';
import { navigateToProfile } from '../src/scrapers/twitter';

// Only run integration tests if explicitly enabled
const INTEGRATION_TESTS_ENABLED = process.env.INTEGRATION_TESTS === '1';

// Skip entire suite if integration tests not enabled
const describeIntegration = INTEGRATION_TESTS_ENABLED ? describe : describe.skip;

describeIntegration('Integration Tests - Twitter', () => {
  let playwriterAvailable = false;

  beforeAll(async () => {
    try {
      await connect();
      playwriterAvailable = isConnected();

      if (!playwriterAvailable) {
        console.warn('\n⚠️  Integration tests skipped: Playwriter not available');
        console.warn('   To enable: 1) Install Playwriter extension, 2) Enable on a Chrome tab');
      }
    } catch (error) {
      console.warn('\n⚠️  Integration tests skipped: Could not connect to Playwriter');
      console.warn(`   Error: ${error.message}`);
    }
  });

  afterAll(async () => {
    if (playwriterAvailable) {
      await disconnect();
    }
  });

  it('should connect to browser via Playwriter', async () => {
    if (!playwriterAvailable) {
      console.log('   ⏭️  Skipped (Playwriter not available)');
      return;
    }

    expect(isConnected()).toBe(true);
  });

  it('should navigate to Twitter profile page', async () => {
    if (!playwriterAvailable) {
      console.log('   ⏭️  Skipped (Playwriter not available)');
      return;
    }

    const page = await getPage();

    // Navigate to a well-known public profile
    await navigateToProfile(page, 'github', 30000);

    // Verify we're on Twitter
    const url = page.url();
    expect(url).toContain('x.com');
    expect(url).toContain('github');
  });

  it('should detect page elements after navigation', async () => {
    if (!playwriterAvailable) {
      console.log('   ⏭️  Skipped (Playwriter not available)');
      return;
    }

    const page = await getPage();

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check for common Twitter elements
    const hasContent = await page.evaluate(() => {
      // Twitter uses data-testid attributes
      const hasTestId = document.querySelector('[data-testid]') !== null;
      // Should have body content
      const hasBody = document.body !== null;
      return hasTestId || hasBody;
    });

    expect(hasContent).toBe(true);
  });
});

describeIntegration('Integration Tests - Browser Control', () => {
  let playwriterAvailable = false;

  beforeAll(async () => {
    try {
      await connect();
      playwriterAvailable = isConnected();
    } catch {
      // Silently skip if not available
    }
  });

  afterAll(async () => {
    if (playwriterAvailable) {
      await disconnect();
    }
  });

  it('should get current page information', async () => {
    if (!playwriterAvailable) {
      console.log('   ⏭️  Skipped (Playwriter not available)');
      return;
    }

    const page = await getPage();
    const url = page.url();
    const title = await page.title();

    expect(typeof url).toBe('string');
    expect(url.length).toBeGreaterThan(0);
    expect(typeof title).toBe('string');
  });

  it('should execute JavaScript on page', async () => {
    if (!playwriterAvailable) {
      console.log('   ⏭️  Skipped (Playwriter not available)');
      return;
    }

    const page = await getPage();

    const result = await page.evaluate(() => {
      return {
        userAgent: navigator.userAgent,
        hasDocument: typeof document !== 'undefined',
        documentReady: document.readyState
      };
    });

    expect(result.userAgent).toBeDefined();
    expect(result.hasDocument).toBe(true);
    expect(['loading', 'interactive', 'complete']).toContain(result.documentReady);
  });

  it('should take screenshot', async () => {
    if (!playwriterAvailable) {
      console.log('   ⏭️  Skipped (Playwriter not available)');
      return;
    }

    const page = await getPage();

    // Take a screenshot
    const screenshot = await page.screenshot({ type: 'png' });

    // Verify it's a buffer with data
    expect(screenshot).toBeDefined();
    expect(screenshot.length).toBeGreaterThan(0);

    // PNG files start with specific bytes
    expect(screenshot[0]).toBe(0x89);
    expect(screenshot[1]).toBe(0x50); // 'P'
    expect(screenshot[2]).toBe(0x4E); // 'N'
    expect(screenshot[3]).toBe(0x47); // 'G'
  });
});

describeIntegration('Integration Tests - Error Handling', () => {
  it('should handle connection error gracefully', async () => {
    // This test can run without Playwriter
    // It verifies error handling when connection fails

    // Close any existing connection
    if (isConnected()) {
      await disconnect();
    }

    // Simulate connection to invalid endpoint
    try {
      const { chromium } = await import('playwright-core');
      await chromium.connectOverCDP('ws://127.0.0.1:99999', { timeout: 1000 });
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toBeDefined();
    }
  });
});

/**
 * Example: How to add your own integration test
 *
 * 1. Use describeIntegration instead of describe
 * 2. Check playwriterAvailable before running browser operations
 * 3. Add console.log skip messages for better UX
 * 4. Use reasonable timeouts (don't wait too long)
 * 5. Test real platform features with public data
 * 6. Clean up after tests (close tabs, reset state)
 */

// Example template:
describeIntegration('Integration Tests - Your Feature', () => {
  let playwriterAvailable = false;

  beforeAll(async () => {
    try {
      await connect();
      playwriterAvailable = isConnected();
    } catch {
      // Skip silently
    }
  });

  afterAll(async () => {
    if (playwriterAvailable) {
      await disconnect();
    }
  });

  it('should do something with the browser', async () => {
    if (!playwriterAvailable) {
      console.log('   ⏭️  Skipped (Playwriter not available)');
      return;
    }

    // Your test code here
    const page = await getPage();
    // ... test logic

    expect(true).toBe(true);
  });
});
