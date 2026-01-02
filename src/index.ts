#!/usr/bin/env bun
/**
 * X-CLI - A fast, type-safe CLI for X (Twitter)
 *
 * Entry point for the CLI application.
 */

import { Command } from "commander";
import chalk from "chalk";
import { createAuthCommand, createMeCommand, createUserCommand } from "./cli/index.js";
import { setOutputOptions } from "./output/index.js";

const program = new Command();

program
  .name("x")
  .description("A fast, type-safe CLI for X (Twitter)")
  .version("0.1.0");

// Global options (must be defined before subcommands)
program
  .option("-j, --json", "Force JSON output")
  .option("-q, --quiet", "Suppress non-essential output")
  .option("-v, --verbose", "Debug information")
  .option("--no-color", "Disable colors");

// Hook to process global options before commands run
program.hook("preAction", (thisCommand) => {
  const opts = thisCommand.opts();

  // Set global output options
  setOutputOptions({
    json: opts.json,
    quiet: opts.quiet,
    verbose: opts.verbose,
    color: opts.color,
  });

  // Disable colors if requested
  if (!opts.color) {
    chalk.level = 0;
  }
});

// Add commands
program.addCommand(createAuthCommand());
program.addCommand(createMeCommand());
program.addCommand(createUserCommand());

// Parse and execute
program.parse();
