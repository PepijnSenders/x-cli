/**
 * browse CLI - Scrape any webpage to markdown using your browser session
 *
 * Usage:
 *   browse init           Start the daemon
 *   browse stop           Stop the daemon
 *   browse <url>          Scrape URL and output markdown
 *   browse <url> --raw    Output cleaned HTML instead of markdown
 */

import { Command } from 'commander';
import { startDaemon, stopDaemon, runDaemon } from './daemon.js';
import { scrape } from './scrape.js';
import { VERSION } from './version.js';

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
    .version(VERSION);

  // Default command: browse <url>
  program
    .argument('[url]', 'URL to scrape')
    .option('--raw', 'output cleaned HTML instead of markdown')
    .option('--wait <ms>', 'wait time after page load in ms', '2000')
    .option('--scroll <n>', 'number of times to scroll for infinite scroll pages', '0')
    .action(async (url: string | undefined, options: {
      raw?: boolean;
      wait?: string;
      scroll?: string;
    }) => {
      if (!url) {
        program.help();
        return;
      }

      try {
        await scrape(url, {
          raw: options.raw,
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
