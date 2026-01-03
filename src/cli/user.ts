import { Command } from "commander";
import { getMe, getUserByUsername, getUserById } from "../api/users.js";
import { searchTweets } from "../api/posts.js";
import {
  output,
  isJsonMode,
  printError,
  formatUserProfile,
  formatUserList,
  createSpinner,
} from "../output/index.js";
import { XCLIError, ValidationError } from "../types/errors.js";
import type { User } from "../types/index.js";

/**
 * Create me command (shortcut for current user)
 */
export function createMeCommand(): Command {
  return new Command("me")
    .description("Show authenticated user's profile")
    .action(async () => {
      try {
        const user = await getMe();

        if (isJsonMode()) {
          output(user);
        } else {
          console.log(formatUserProfile(user));
        }
      } catch (error) {
        if (error instanceof XCLIError) {
          if (isJsonMode()) {
            output({ error: error.message, code: error.code });
          } else {
            printError(error);
          }
        } else {
          throw error;
        }
        process.exit(1);
      }
    });
}

/**
 * Create user command
 */
export function createUserCommand(): Command {
  const user = new Command("user")
    .description("Get user profile by username or ID");

  // Default action: lookup by username
  user
    .argument("[username]", "Username to look up (with or without @)")
    .option("--id <id>", "Look up user by ID instead of username")
    .action(async (username: string | undefined, options) => {
      try {
        let userResult;

        if (options.id) {
          // Lookup by ID
          userResult = await getUserById(options.id);
        } else if (username) {
          // Lookup by username
          userResult = await getUserByUsername(username);
        } else {
          throw new ValidationError("Provide a username or use --id <id>");
        }

        if (isJsonMode()) {
          output(userResult);
        } else {
          console.log(formatUserProfile(userResult));
        }
      } catch (error) {
        if (error instanceof XCLIError) {
          if (isJsonMode()) {
            output({ error: error.message, code: error.code });
          } else {
            printError(error);
          }
        } else {
          throw error;
        }
        process.exit(1);
      }
    });

  // Search subcommand
  user
    .command("search")
    .description("Search for users (via recent tweets)")
    .argument("<query>", "Search query")
    .option("--limit <n>", "Maximum users to return", "10")
    .action(async (query: string, options) => {
      const spinner = createSpinner("Searching users...");

      try {
        if (!isJsonMode()) {
          spinner.start();
        }

        // X API v2 doesn't have user search, so we search tweets and extract unique users
        const limit = Math.min(parseInt(options.limit, 10) || 10, 100);
        const searchLimit = Math.min(limit * 3, 100); // Search more tweets to get enough unique users

        const results = await searchTweets(query, { max_results: searchLimit });
        const users = results.includes?.users || [];

        // Deduplicate users by ID
        const uniqueUsers = new Map<string, User>();
        for (const u of users) {
          if (!uniqueUsers.has(u.id) && uniqueUsers.size < limit) {
            uniqueUsers.set(u.id, u);
          }
        }

        const userList = Array.from(uniqueUsers.values());

        if (!isJsonMode()) {
          spinner.succeed(`Found ${userList.length} users`);
        }

        if (isJsonMode()) {
          output(userList);
        } else if (userList.length === 0) {
          console.log("No users found");
        } else {
          console.log(formatUserList(userList));
        }
      } catch (error) {
        if (!isJsonMode()) {
          spinner.fail("Search failed");
        }
        if (error instanceof XCLIError) {
          if (isJsonMode()) {
            output({ error: error.message, code: error.code });
          } else {
            printError(error);
          }
        } else {
          throw error;
        }
        process.exit(1);
      }
    });

  return user;
}
