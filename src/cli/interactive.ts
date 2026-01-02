import * as readline from "readline";
import chalk from "chalk";
import { spawn } from "child_process";

/**
 * Built-in REPL commands
 */
const BUILTIN_COMMANDS = {
  exit: "Exit the REPL",
  quit: "Exit the REPL",
  clear: "Clear the screen",
  history: "Show command history",
  help: "Show help",
};

/**
 * Command history
 */
const commandHistory: string[] = [];

/**
 * Show REPL help
 */
function showHelp(): void {
  console.log();
  console.log(chalk.bold("X-CLI Interactive Mode"));
  console.log();
  console.log("Enter any x-cli command without the 'x' prefix.");
  console.log();
  console.log(chalk.bold("Examples:"));
  console.log("  timeline home        # Show home timeline");
  console.log("  post create \"Hello!\" # Create a post");
  console.log('  grok "summarize my mentions"');
  console.log();
  console.log(chalk.bold("Built-in commands:"));
  for (const [cmd, desc] of Object.entries(BUILTIN_COMMANDS)) {
    console.log(`  ${chalk.cyan(cmd.padEnd(10))} ${desc}`);
  }
  console.log();
}

/**
 * Show command history
 */
function showHistory(): void {
  if (commandHistory.length === 0) {
    console.log(chalk.dim("No command history"));
    return;
  }

  console.log(chalk.bold("Command History:"));
  commandHistory.forEach((cmd, i) => {
    console.log(`  ${chalk.dim(String(i + 1).padStart(3))} ${cmd}`);
  });
}

/**
 * Execute a command by spawning a new process
 */
async function executeCommand(input: string): Promise<void> {
  // Parse the input into arguments
  const args = parseArgs(input);
  if (args.length === 0) return;

  const command = args[0].toLowerCase();

  // Handle built-in commands
  if (command === "exit" || command === "quit") {
    console.log(chalk.dim("Goodbye!"));
    process.exit(0);
  }

  if (command === "clear") {
    console.clear();
    return;
  }

  if (command === "history") {
    showHistory();
    return;
  }

  if (command === "help") {
    if (args.length > 1) {
      // Pass to x help
      await runXCommand(["help", ...args.slice(1)]);
    } else {
      showHelp();
    }
    return;
  }

  // Add to history
  commandHistory.push(input);

  // Run as x command
  await runXCommand(args);
}

/**
 * Run x-cli command
 */
function runXCommand(args: string[]): Promise<void> {
  return new Promise((resolve) => {
    const child = spawn("bun", ["run", "src/index.ts", ...args], {
      stdio: "inherit",
      cwd: process.cwd(),
    });

    child.on("close", () => {
      resolve();
    });

    child.on("error", (err) => {
      console.error(chalk.red(`Error: ${err.message}`));
      resolve();
    });
  });
}

/**
 * Parse command line arguments (handles quotes)
 */
function parseArgs(input: string): string[] {
  const args: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuote) {
      if (char === quoteChar) {
        inQuote = false;
        quoteChar = "";
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      inQuote = true;
      quoteChar = char;
    } else if (char === " " || char === "\t") {
      if (current) {
        args.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) {
    args.push(current);
  }

  return args;
}

/**
 * Start interactive REPL mode
 */
export async function startInteractiveMode(): Promise<void> {
  console.log();
  console.log(chalk.bold.blue("X-CLI Interactive Mode"));
  console.log(chalk.dim("Type 'help' for available commands, 'exit' to quit"));
  console.log();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    historySize: 100,
    prompt: chalk.cyan("x> "),
    completer: (line: string) => {
      const commands = [
        "auth",
        "me",
        "user",
        "post",
        "timeline",
        "search",
        "like",
        "unlike",
        "repost",
        "unrepost",
        "bookmark",
        "follow",
        "unfollow",
        "following",
        "followers",
        "block",
        "unblock",
        "blocks",
        "mute",
        "unmute",
        "mutes",
        "list",
        "lists",
        "dm",
        "space",
        "spaces",
        "media",
        "grok",
        "config",
        "exit",
        "quit",
        "clear",
        "history",
        "help",
      ];

      const hits = commands.filter((c) => c.startsWith(line.toLowerCase()));
      return [hits.length ? hits : commands, line];
    },
  });

  // Handle Ctrl+C gracefully
  rl.on("SIGINT", () => {
    console.log();
    console.log(chalk.dim("(Use 'exit' or 'quit' to leave)"));
    rl.prompt();
  });

  rl.prompt();

  rl.on("line", async (line) => {
    const input = line.trim();

    if (input) {
      try {
        await executeCommand(input);
      } catch (error) {
        console.error(
          chalk.red(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
        );
      }
    }

    console.log(); // Add spacing
    rl.prompt();
  });

  rl.on("close", () => {
    console.log(chalk.dim("\nGoodbye!"));
    process.exit(0);
  });
}
