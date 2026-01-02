import { Command } from "commander";
import chalk from "chalk";
import {
  getSetting,
  setSetting,
  getAllSettings,
  resetSettings,
  CONFIG_KEYS,
  type ConfigKey,
} from "../config/settings.js";
import { output, isJsonMode, printError } from "../output/index.js";
import { XCLIError, ErrorCode } from "../types/errors.js";

/**
 * Create config command with subcommands
 */
export function createConfigCommand(): Command {
  const config = new Command("config").description("Configuration management");

  // Get config value
  config
    .command("get")
    .description("Get a configuration value")
    .argument("<key>", `Config key (${CONFIG_KEYS.join(", ")})`)
    .action(async (key: string) => {
      try {
        if (!CONFIG_KEYS.includes(key as ConfigKey)) {
          throw new XCLIError(
            `Unknown config key: ${key}. Valid keys: ${CONFIG_KEYS.join(", ")}`,
            ErrorCode.VALIDATION
          );
        }

        const value = await getSetting(key as ConfigKey);

        if (isJsonMode()) {
          output({ [key]: value });
        } else {
          console.log(`${key}=${value}`);
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

  // Set config value
  config
    .command("set")
    .description("Set a configuration value")
    .argument("<key>", `Config key (${CONFIG_KEYS.join(", ")})`)
    .argument("<value>", "Value to set")
    .action(async (key: string, value: string) => {
      try {
        if (!CONFIG_KEYS.includes(key as ConfigKey)) {
          throw new XCLIError(
            `Unknown config key: ${key}. Valid keys: ${CONFIG_KEYS.join(", ")}`,
            ErrorCode.VALIDATION
          );
        }

        await setSetting(key as ConfigKey, value);

        if (isJsonMode()) {
          output({ success: true, key, value });
        } else {
          console.log(chalk.green(`Set ${key}=${value}`));
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

  // List all config
  config
    .command("list")
    .description("List all configuration values")
    .action(async () => {
      try {
        const settings = await getAllSettings();

        if (isJsonMode()) {
          output(settings);
        } else {
          console.log(chalk.bold("Configuration:"));
          console.log();
          for (const [key, value] of Object.entries(settings)) {
            console.log(`  ${chalk.cyan(key)}=${value}`);
          }
          console.log();
          console.log(chalk.dim(`Config file: ~/.config/x-cli/config.json`));
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

  // Reset config
  config
    .command("reset")
    .description("Reset configuration to defaults")
    .action(async () => {
      try {
        await resetSettings();

        if (isJsonMode()) {
          output({ success: true, message: "Configuration reset to defaults" });
        } else {
          console.log(chalk.green("Configuration reset to defaults"));
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

  return config;
}
