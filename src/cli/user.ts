import { Command } from "commander";
import { getMe, getUserByUsername } from "../api/users.js";
import {
  output,
  isJsonMode,
  printError,
  formatUserProfile,
} from "../output/index.js";
import { XCLIError } from "../types/errors.js";

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
  return new Command("user")
    .description("Get user profile")
    .argument("<username>", "Username to look up (with or without @)")
    .action(async (username: string) => {
      try {
        const user = await getUserByUsername(username);

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
