/**
 * CLI entry point for session-scraper
 * Uses Commander.js to parse commands and options
 */

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { GlobalOptions, ErrorCode } from './types.js';
import * as twitter from './commands/twitter.js';
import * as linkedin from './commands/linkedin.js';
import * as browser from './commands/browser.js';
import * as page from './commands/page.js';

// Get package.json for version info
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

/**
 * Output JSON to stdout
 */
function outputJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Output error to stderr and exit with appropriate code
 */
function outputError(error: Error, code: ErrorCode = 1, hint?: string): never {
  const errorOutput = {
    error: error.message,
    code,
    ...(hint && { hint }),
  };
  console.error(JSON.stringify(errorOutput, null, 2));
  process.exit(code);
}

/**
 * Wrap command handler to catch errors and format output
 */
function wrapCommand<T extends unknown[]>(
  handler: (...args: T) => Promise<void>
): (...args: T) => Promise<void> {
  return async (...args: T) => {
    try {
      await handler(...args);
    } catch (error) {
      if (error instanceof Error) {
        // Map error types to exit codes
        const errorMessage = error.message.toLowerCase();
        let code: ErrorCode = 1;
        let hint: string | undefined;

        if (errorMessage.includes('not connected') || errorMessage.includes('connection')) {
          code = 2;
          hint = 'Make sure Chrome has the Playwriter extension installed and enabled.';
        } else if (errorMessage.includes('no pages')) {
          code = 3;
          hint = 'Open at least one browser tab.';
        } else if (errorMessage.includes('timeout')) {
          code = 4;
          hint = 'Try increasing the timeout with --timeout option.';
        } else if (errorMessage.includes('not found') && errorMessage.includes('element')) {
          code = 5;
          hint = 'The page structure may have changed.';
        } else if (errorMessage.includes('rate limit')) {
          code = 6;
          hint = 'Wait a few minutes before trying again.';
        } else if (errorMessage.includes('login')) {
          code = 7;
          hint = 'Make sure you are logged in to the platform in your browser.';
        } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
          code = 8;
          hint = 'The profile or page does not exist.';
        }

        outputError(error, code, hint);
      }
      outputError(new Error('Unknown error occurred'), 1);
    }
  };
}

/**
 * Parse global options from command
 */
function getGlobalOptions(cmd: Command): GlobalOptions {
  const parent = cmd.parent;
  return {
    format: parent?.opts().format || 'json',
    quiet: parent?.opts().quiet || false,
    timeout: parent?.opts().timeout || 30000,
  };
}

// Create main program
const program = new Command();

program
  .name('session-scraper')
  .description('Scrape sites using your existing browser session (Twitter, LinkedIn, etc.)')
  .version(packageJson.version)
  .option('--format <type>', 'output format (json|text)', 'json')
  .option('--quiet', 'suppress status messages', false)
  .option('--timeout <ms>', 'navigation timeout in milliseconds', '30000');

// ============================================================================
// Twitter Commands
// ============================================================================

const twitterCmd = program
  .command('twitter')
  .description('Twitter scraping commands');

twitterCmd
  .command('profile')
  .description('Get user profile information')
  .argument('<username>', 'Twitter username without @')
  .action(
    wrapCommand(async (username: string, cmd: Command) => {
      await twitter.getProfile(username, getGlobalOptions(cmd));
    })
  );

twitterCmd
  .command('timeline')
  .description('Get tweets from timeline')
  .argument('[username]', 'Twitter username (omit for home timeline)')
  .option('-c, --count <n>', 'number of tweets to fetch', '20')
  .action(
    wrapCommand(async (username: string | undefined, options: { count: string }, cmd: Command) => {
      const count = parseInt(options.count, 10);
      if (isNaN(count) || count < 1 || count > 100) {
        throw new Error('Count must be between 1 and 100');
      }
      await twitter.getTimeline(username, { ...getGlobalOptions(cmd), count });
    })
  );

twitterCmd
  .command('post')
  .description('Get a single tweet with thread context and replies')
  .argument('<url>', 'Tweet URL')
  .action(
    wrapCommand(async (url: string, cmd: Command) => {
      await twitter.getPost(url, getGlobalOptions(cmd));
    })
  );

twitterCmd
  .command('search')
  .description('Search tweets')
  .argument('<query>', 'Search query (supports Twitter search operators)')
  .option('-c, --count <n>', 'number of results to fetch', '20')
  .action(
    wrapCommand(async (query: string, options: { count: string }, cmd: Command) => {
      const count = parseInt(options.count, 10);
      if (isNaN(count) || count < 1 || count > 100) {
        throw new Error('Count must be between 1 and 100');
      }
      await twitter.search(query, { ...getGlobalOptions(cmd), count });
    })
  );

// ============================================================================
// LinkedIn Commands
// ============================================================================

const linkedinCmd = program
  .command('linkedin')
  .description('LinkedIn scraping commands');

linkedinCmd
  .command('profile')
  .description('Get profile information')
  .argument('<url>', 'LinkedIn profile URL')
  .action(
    wrapCommand(async (url: string, cmd: Command) => {
      await linkedin.getProfile(url, getGlobalOptions(cmd));
    })
  );

linkedinCmd
  .command('posts')
  .description('Get posts from a profile')
  .argument('<url>', 'LinkedIn profile URL')
  .option('-c, --count <n>', 'number of posts to fetch', '10')
  .action(
    wrapCommand(async (url: string, options: { count: string }, cmd: Command) => {
      const count = parseInt(options.count, 10);
      if (isNaN(count) || count < 1 || count > 50) {
        throw new Error('Count must be between 1 and 50');
      }
      await linkedin.getPosts(url, { ...getGlobalOptions(cmd), count });
    })
  );

linkedinCmd
  .command('search')
  .description('Search LinkedIn')
  .argument('<query>', 'Search query')
  .option('-t, --type <type>', 'search type (people|posts|companies)', 'people')
  .option('-c, --count <n>', 'number of results to fetch', '10')
  .action(
    wrapCommand(
      async (query: string, options: { type: string; count: string }, cmd: Command) => {
        const count = parseInt(options.count, 10);
        if (isNaN(count) || count < 1 || count > 50) {
          throw new Error('Count must be between 1 and 50');
        }
        const type = options.type as 'people' | 'posts' | 'companies';
        if (!['people', 'posts', 'companies'].includes(type)) {
          throw new Error('Type must be one of: people, posts, companies');
        }
        await linkedin.search(query, { ...getGlobalOptions(cmd), type, count });
      }
    )
  );

// ============================================================================
// Browser Commands
// ============================================================================

const browserCmd = program
  .command('browser')
  .description('Generic browser control commands');

browserCmd
  .command('navigate')
  .description('Navigate to a URL')
  .argument('<url>', 'URL to navigate to')
  .action(
    wrapCommand(async (url: string, cmd: Command) => {
      await browser.navigate(url, getGlobalOptions(cmd));
    })
  );

browserCmd
  .command('screenshot')
  .description('Take a screenshot')
  .option('-o, --output <file>', 'save to file (default: stdout as base64)')
  .option('-f, --full-page', 'capture full page, not just viewport', false)
  .action(
    wrapCommand(async (options: { output?: string; fullPage: boolean }, cmd: Command) => {
      await browser.screenshot({
        ...getGlobalOptions(cmd),
        output: options.output,
        fullPage: options.fullPage,
      });
    })
  );

browserCmd
  .command('info')
  .description('Get current page info')
  .action(
    wrapCommand(async (cmd: Command) => {
      await browser.info(getGlobalOptions(cmd));
    })
  );

browserCmd
  .command('list')
  .description('List controlled tabs')
  .action(
    wrapCommand(async (cmd: Command) => {
      await browser.list(getGlobalOptions(cmd));
    })
  );

browserCmd
  .command('switch')
  .description('Switch to a different tab')
  .argument('<index>', 'tab index to switch to')
  .action(
    wrapCommand(async (index: string, cmd: Command) => {
      const tabIndex = parseInt(index, 10);
      if (isNaN(tabIndex) || tabIndex < 0) {
        throw new Error('Index must be a non-negative number');
      }
      await browser.switchTab(tabIndex, getGlobalOptions(cmd));
    })
  );

// ============================================================================
// Page Commands
// ============================================================================

const pageCmd = program
  .command('page')
  .description('Generic page scraping commands');

pageCmd
  .command('scrape')
  .description('Extract content from current page')
  .option('-s, --selector <css>', 'CSS selector to scope extraction')
  .action(
    wrapCommand(async (options: { selector?: string }, cmd: Command) => {
      await page.scrape({
        ...getGlobalOptions(cmd),
        selector: options.selector,
      });
    })
  );

pageCmd
  .command('script')
  .description('Execute JavaScript on the page')
  .argument('<code>', 'JavaScript code to execute (must return JSON-serializable value)')
  .action(
    wrapCommand(async (code: string, cmd: Command) => {
      await page.script(code, getGlobalOptions(cmd));
    })
  );

// Export for testing and programmatic use
export { program, outputJson, outputError };

// Parse and execute (called from index.ts)
program.parse(process.argv);
