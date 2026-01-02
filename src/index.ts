#!/usr/bin/env bun
/**
 * X-CLI - A fast, type-safe CLI for X (Twitter)
 *
 * Entry point for the CLI application.
 */

import { Command } from "commander";
import chalk from "chalk";
import {
  createAuthCommand,
  createMeCommand,
  createUserCommand,
  createPostCommand,
  createTimelineCommand,
  createSearchCommand,
  createLikeCommand,
  createUnlikeCommand,
  createRepostCommand,
  createUnrepostCommand,
  createBookmarkCommand,
  createFollowCommand,
  createUnfollowCommand,
  createFollowingCommand,
  createFollowersCommand,
  createBlockCommand,
  createUnblockCommand,
  createBlocksCommand,
  createMuteCommand,
  createUnmuteCommand,
  createMutesCommand,
  createListCommand,
  createListsCommand,
  createDMCommand,
  createSpaceCommand,
  createSpacesCommand,
  createMediaCommand,
  createGrokCommand,
  createConfigCommand,
  createCompletionCommand,
  startInteractiveMode,
} from "./cli/index.js";
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
  .option("--no-color", "Disable colors")
  .option("-i, --interactive", "Start interactive REPL mode");

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
program.addCommand(createPostCommand());
program.addCommand(createTimelineCommand());
program.addCommand(createSearchCommand());
program.addCommand(createLikeCommand());
program.addCommand(createUnlikeCommand());
program.addCommand(createRepostCommand());
program.addCommand(createUnrepostCommand());
program.addCommand(createBookmarkCommand());
program.addCommand(createFollowCommand());
program.addCommand(createUnfollowCommand());
program.addCommand(createFollowingCommand());
program.addCommand(createFollowersCommand());
program.addCommand(createBlockCommand());
program.addCommand(createUnblockCommand());
program.addCommand(createBlocksCommand());
program.addCommand(createMuteCommand());
program.addCommand(createUnmuteCommand());
program.addCommand(createMutesCommand());
program.addCommand(createListCommand());
program.addCommand(createListsCommand());
program.addCommand(createDMCommand());
program.addCommand(createSpaceCommand());
program.addCommand(createSpacesCommand());
program.addCommand(createMediaCommand());
program.addCommand(createGrokCommand());
program.addCommand(createConfigCommand());
program.addCommand(createCompletionCommand());

// Handle interactive mode before parsing
const args = process.argv.slice(2);
if (args.includes("-i") || args.includes("--interactive")) {
  // Start interactive mode
  startInteractiveMode();
} else {
  // Parse and execute normally
  program.parse();
}
