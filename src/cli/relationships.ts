import { Command } from "commander";
import {
  followUser,
  unfollowUser,
  getFollowing,
  getFollowers,
  blockUser,
  unblockUser,
  getBlocked,
  muteUser,
  unmuteUser,
  getMuted,
} from "../api/relationships.js";
import { getMe, getUserByUsername } from "../api/users.js";
import {
  output,
  isJsonMode,
  printError,
  createSpinner,
  formatUserList,
} from "../output/index.js";
import { XCLIError } from "../types/errors.js";

/**
 * Create follow command
 */
export function createFollowCommand(): Command {
  return new Command("follow")
    .description("Follow a user")
    .argument("<username>", "Username to follow")
    .action(async (username: string) => {
      const spinner = createSpinner("Following user...");

      try {
        if (!isJsonMode()) {
          spinner.start();
        }

        const me = await getMe();
        const targetUser = await getUserByUsername(username);
        const result = await followUser(me.id, targetUser.id);

        if (!isJsonMode()) {
          if (result.pending_follow) {
            spinner.succeed(`Follow request sent to @${targetUser.username}`);
          } else {
            spinner.succeed(`Now following @${targetUser.username}`);
          }
        } else {
          output({ following: result.following, pending: result.pending_follow });
        }
      } catch (error) {
        if (!isJsonMode()) {
          spinner.fail("Failed to follow user");
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
}

/**
 * Create unfollow command
 */
export function createUnfollowCommand(): Command {
  return new Command("unfollow")
    .description("Unfollow a user")
    .argument("<username>", "Username to unfollow")
    .action(async (username: string) => {
      const spinner = createSpinner("Unfollowing user...");

      try {
        if (!isJsonMode()) {
          spinner.start();
        }

        const me = await getMe();
        const targetUser = await getUserByUsername(username);
        const unfollowed = await unfollowUser(me.id, targetUser.id);

        if (!isJsonMode()) {
          spinner.succeed(`Unfollowed @${targetUser.username}`);
        } else {
          output({ unfollowed });
        }
      } catch (error) {
        if (!isJsonMode()) {
          spinner.fail("Failed to unfollow user");
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
}

/**
 * Create following command
 */
export function createFollowingCommand(): Command {
  return new Command("following")
    .description("List users you (or another user) are following")
    .argument("[username]", "Username to check (defaults to you)")
    .option("-l, --limit <n>", "Number of users", "100")
    .action(async (username: string | undefined, options) => {
      try {
        let userId: string;
        let targetUsername: string;

        if (username) {
          const user = await getUserByUsername(username);
          userId = user.id;
          targetUsername = user.username;
        } else {
          const me = await getMe();
          userId = me.id;
          targetUsername = me.username;
        }

        const response = await getFollowing(userId, {
          max_results: parseInt(options.limit, 10),
        });

        if (isJsonMode()) {
          output(response);
        } else {
          if (!response.data || response.data.length === 0) {
            console.log(`@${targetUsername} is not following anyone`);
            return;
          }
          console.log(`@${targetUsername} is following:\n`);
          console.log(formatUserList(response.data));
          if (response.meta?.next_token) {
            console.log(`\n--- More users available ---`);
          }
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
 * Create followers command
 */
export function createFollowersCommand(): Command {
  return new Command("followers")
    .description("List users following you (or another user)")
    .argument("[username]", "Username to check (defaults to you)")
    .option("-l, --limit <n>", "Number of users", "100")
    .action(async (username: string | undefined, options) => {
      try {
        let userId: string;
        let targetUsername: string;

        if (username) {
          const user = await getUserByUsername(username);
          userId = user.id;
          targetUsername = user.username;
        } else {
          const me = await getMe();
          userId = me.id;
          targetUsername = me.username;
        }

        const response = await getFollowers(userId, {
          max_results: parseInt(options.limit, 10),
        });

        if (isJsonMode()) {
          output(response);
        } else {
          if (!response.data || response.data.length === 0) {
            console.log(`@${targetUsername} has no followers`);
            return;
          }
          console.log(`@${targetUsername}'s followers:\n`);
          console.log(formatUserList(response.data));
          if (response.meta?.next_token) {
            console.log(`\n--- More users available ---`);
          }
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
 * Create block command
 */
export function createBlockCommand(): Command {
  return new Command("block")
    .description("Block a user")
    .argument("<username>", "Username to block")
    .action(async (username: string) => {
      const spinner = createSpinner("Blocking user...");

      try {
        if (!isJsonMode()) {
          spinner.start();
        }

        const me = await getMe();
        const targetUser = await getUserByUsername(username);
        const blocked = await blockUser(me.id, targetUser.id);

        if (!isJsonMode()) {
          spinner.succeed(`Blocked @${targetUser.username}`);
        } else {
          output({ blocked });
        }
      } catch (error) {
        if (!isJsonMode()) {
          spinner.fail("Failed to block user");
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
}

/**
 * Create unblock command
 */
export function createUnblockCommand(): Command {
  return new Command("unblock")
    .description("Unblock a user")
    .argument("<username>", "Username to unblock")
    .action(async (username: string) => {
      const spinner = createSpinner("Unblocking user...");

      try {
        if (!isJsonMode()) {
          spinner.start();
        }

        const me = await getMe();
        const targetUser = await getUserByUsername(username);
        const unblocked = await unblockUser(me.id, targetUser.id);

        if (!isJsonMode()) {
          spinner.succeed(`Unblocked @${targetUser.username}`);
        } else {
          output({ unblocked });
        }
      } catch (error) {
        if (!isJsonMode()) {
          spinner.fail("Failed to unblock user");
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
}

/**
 * Create blocks command (list blocked users)
 */
export function createBlocksCommand(): Command {
  return new Command("blocks")
    .description("List blocked users")
    .option("-l, --limit <n>", "Number of users", "100")
    .action(async (options) => {
      try {
        const me = await getMe();
        const response = await getBlocked(me.id, {
          max_results: parseInt(options.limit, 10),
        });

        if (isJsonMode()) {
          output(response);
        } else {
          if (!response.data || response.data.length === 0) {
            console.log("You haven't blocked anyone");
            return;
          }
          console.log("Blocked users:\n");
          console.log(formatUserList(response.data));
          if (response.meta?.next_token) {
            console.log(`\n--- More users available ---`);
          }
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
 * Create mute command
 */
export function createMuteCommand(): Command {
  return new Command("mute")
    .description("Mute a user")
    .argument("<username>", "Username to mute")
    .action(async (username: string) => {
      const spinner = createSpinner("Muting user...");

      try {
        if (!isJsonMode()) {
          spinner.start();
        }

        const me = await getMe();
        const targetUser = await getUserByUsername(username);
        const muted = await muteUser(me.id, targetUser.id);

        if (!isJsonMode()) {
          spinner.succeed(`Muted @${targetUser.username}`);
        } else {
          output({ muted });
        }
      } catch (error) {
        if (!isJsonMode()) {
          spinner.fail("Failed to mute user");
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
}

/**
 * Create unmute command
 */
export function createUnmuteCommand(): Command {
  return new Command("unmute")
    .description("Unmute a user")
    .argument("<username>", "Username to unmute")
    .action(async (username: string) => {
      const spinner = createSpinner("Unmuting user...");

      try {
        if (!isJsonMode()) {
          spinner.start();
        }

        const me = await getMe();
        const targetUser = await getUserByUsername(username);
        const unmuted = await unmuteUser(me.id, targetUser.id);

        if (!isJsonMode()) {
          spinner.succeed(`Unmuted @${targetUser.username}`);
        } else {
          output({ unmuted });
        }
      } catch (error) {
        if (!isJsonMode()) {
          spinner.fail("Failed to unmute user");
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
}

/**
 * Create mutes command (list muted users)
 */
export function createMutesCommand(): Command {
  return new Command("mutes")
    .description("List muted users")
    .option("-l, --limit <n>", "Number of users", "100")
    .action(async (options) => {
      try {
        const me = await getMe();
        const response = await getMuted(me.id, {
          max_results: parseInt(options.limit, 10),
        });

        if (isJsonMode()) {
          output(response);
        } else {
          if (!response.data || response.data.length === 0) {
            console.log("You haven't muted anyone");
            return;
          }
          console.log("Muted users:\n");
          console.log(formatUserList(response.data));
          if (response.meta?.next_token) {
            console.log(`\n--- More users available ---`);
          }
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
