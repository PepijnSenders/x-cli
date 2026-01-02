import { homedir } from "os";
import { join } from "path";

/**
 * Configuration directory paths
 */
export const CONFIG_DIR = join(homedir(), ".config", "x-cli");
export const TOKENS_FILE = join(CONFIG_DIR, "tokens.json");
export const CONFIG_FILE = join(CONFIG_DIR, "config.json");
