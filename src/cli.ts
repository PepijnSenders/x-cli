/**
 * browse CLI - Scrape any webpage to markdown using your browser session
 *
 * Usage:
 *   browse init           Start the daemon
 *   browse stop           Stop the daemon
 *   browse <url>          Scrape URL and output markdown
 */

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { startDaemon, stopDaemon, runDaemon } from './daemon.js';
import { scrape } from './scrape.js';

// Get package.json for version info
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

// Handle daemon mode (spawned by `browse init`)
if (process.argv[2] === '__daemon__') {
  runDaemon().catch((err) => {
    console.error('Daemon error:', err);
    process.exit(1);
  });
} else {
  // Normal CLI mode
  const program = new Command();

  program
    .name('browse')
    .description('Scrape any webpage to markdown using your browser session')
    .version(packageJson.version);

  // Default command: browse <url>
  program
    .argument('[url]', 'URL to scrape')
    .option('--json', 'output JSON with url/title metadata')
    .option('--html', 'output pruned HTML instead of markdown')
    .option('--wait <ms>', 'wait time after page load in ms', '2000')
    .option('--scroll <n>', 'number of times to scroll for infinite scroll pages', '0')
    .action(async (url: string | undefined, options: {
      json?: boolean;
      html?: boolean;
      wait?: string;
      scroll?: string;
    }) => {
      if (!url) {
        program.help();
        return;
      }

      try {
        await scrape(url, {
          json: options.json,
          html: options.html,
          wait: parseInt(options.wait || '2000', 10),
          scroll: parseInt(options.scroll || '0', 10),
        });
        process.exit(0);
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error:', error.message);
        } else {
          console.error('Error:', error);
        }
        process.exit(1);
      }
    });

  // browse init
  program
    .command('init')
    .description('Start the browse daemon')
    .action(async () => {
      try {
        await startDaemon();
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error:', error.message);
        }
        process.exit(1);
      }
    });

  // browse stop
  program
    .command('stop')
    .description('Stop the browse daemon')
    .action(async () => {
      try {
        await stopDaemon();
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error:', error.message);
        }
        process.exit(1);
      }
    });

  program.parse();
}
