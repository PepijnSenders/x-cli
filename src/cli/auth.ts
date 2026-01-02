import { Command } from "commander";
import chalk from "chalk";
import { login, refreshAccessToken, revokeToken } from "../auth/oauth.js";
import {
  loadTokens,
  clearTokens,
  isTokenExpired,
  getTokenExpiresIn,
} from "../config/tokens.js";
import { getMe } from "../api/users.js";
import {
  output,
  isJsonMode,
  printSuccess,
  printError,
  printInfo,
  createSpinner,
  formatDuration,
} from "../output/index.js";
import { XCLIError, AuthError } from "../types/errors.js";

/**
 * Create auth command group
 */
export function createAuthCommand(): Command {
  const auth = new Command("auth").description("Authentication commands");

  // Login command
  auth
    .command("login")
    .description("Login with OAuth 2.0")
    .action(async () => {
      const spinner = createSpinner("Opening browser for authentication...");

      try {
        if (!isJsonMode()) {
          spinner.start();
        }

        await login();

        if (!isJsonMode()) {
          spinner.succeed("Authenticated successfully!");
        }

        // Fetch user info
        try {
          const user = await getMe();
          if (isJsonMode()) {
            output({
              success: true,
              user: {
                id: user.id,
                username: user.username,
                name: user.name,
              },
            });
          } else {
            console.log("");
            printSuccess(`Logged in as @${user.username}`);
          }
        } catch {
          // Token saved, but couldn't fetch user - still success
          if (isJsonMode()) {
            output({ success: true });
          }
        }
      } catch (error) {
        if (!isJsonMode()) {
          spinner.fail("Authentication failed");
        }
        if (error instanceof XCLIError) {
          if (isJsonMode()) {
            output({ success: false, error: error.message, code: error.code });
          } else {
            printError(error);
          }
        } else {
          throw error;
        }
        process.exit(1);
      }
    });

  // Logout command
  auth
    .command("logout")
    .description("Clear stored tokens")
    .action(async () => {
      try {
        const existingTokens = await loadTokens();

        if (existingTokens) {
          // Try to revoke token with X API
          try {
            await revokeToken(existingTokens.access_token);
          } catch {
            // Ignore revocation errors - still clear local tokens
          }
        }

        await clearTokens();

        if (isJsonMode()) {
          output({ success: true, message: "Logged out" });
        } else {
          printSuccess("Logged out successfully");
        }
      } catch (error) {
        if (error instanceof XCLIError) {
          if (isJsonMode()) {
            output({ success: false, error: error.message, code: error.code });
          } else {
            printError(error);
          }
        } else {
          throw error;
        }
        process.exit(1);
      }
    });

  // Status command
  auth
    .command("status")
    .description("Show current auth status")
    .action(async () => {
      try {
        const tokens = await loadTokens();

        if (!tokens) {
          if (isJsonMode()) {
            output({ authenticated: false });
          } else {
            printInfo("Not logged in. Run 'x auth login' to authenticate.");
          }
          return;
        }

        const expired = isTokenExpired(tokens);
        const expiresIn = getTokenExpiresIn(tokens);

        if (expired) {
          if (isJsonMode()) {
            output({
              authenticated: false,
              expired: true,
              has_refresh_token: !!tokens.refresh_token,
            });
          } else {
            printInfo("Token expired. Run 'x auth refresh' to refresh.");
          }
          return;
        }

        // Try to fetch user info
        try {
          const user = await getMe();

          if (isJsonMode()) {
            output({
              authenticated: true,
              username: user.username,
              name: user.name,
              expires_in: expiresIn,
            });
          } else {
            console.log(
              chalk.green("✓") + ` Logged in as ${chalk.bold("@" + user.username)}`
            );
            if (expiresIn !== null) {
              console.log(
                chalk.gray(`  Token expires in ${formatDuration(expiresIn)}`)
              );
            }
          }
        } catch {
          // Token exists but couldn't verify - show basic status
          if (isJsonMode()) {
            output({
              authenticated: true,
              expires_in: expiresIn,
            });
          } else {
            printSuccess("Authenticated (couldn't verify user)");
            if (expiresIn !== null) {
              console.log(
                chalk.gray(`  Token expires in ${formatDuration(expiresIn)}`)
              );
            }
          }
        }
      } catch (error) {
        if (error instanceof XCLIError) {
          if (isJsonMode()) {
            output({ authenticated: false, error: error.message });
          } else {
            printError(error);
          }
        } else {
          throw error;
        }
        process.exit(1);
      }
    });

  // Refresh command
  auth
    .command("refresh")
    .description("Force token refresh")
    .action(async () => {
      const spinner = createSpinner("Refreshing token...");

      try {
        const tokens = await loadTokens();

        if (!tokens) {
          throw new AuthError("Not logged in. Run 'x auth login' first.");
        }

        if (!tokens.refresh_token) {
          throw new AuthError("No refresh token available. Please login again.");
        }

        if (!isJsonMode()) {
          spinner.start();
        }

        const newTokens = await refreshAccessToken(tokens.refresh_token);
        const expiresIn = getTokenExpiresIn(newTokens);

        if (!isJsonMode()) {
          spinner.succeed("Token refreshed successfully");
          if (expiresIn !== null) {
            console.log(
              chalk.gray(`  New token expires in ${formatDuration(expiresIn)}`)
            );
          }
        } else {
          output({
            success: true,
            expires_in: expiresIn,
          });
        }
      } catch (error) {
        if (!isJsonMode()) {
          spinner.fail("Token refresh failed");
        }
        if (error instanceof XCLIError) {
          if (isJsonMode()) {
            output({ success: false, error: error.message, code: error.code });
          } else {
            printError(error);
          }
        } else {
          throw error;
        }
        process.exit(1);
      }
    });

  return auth;
}
