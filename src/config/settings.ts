/**
 * User settings/configuration management
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { z } from "zod";
import { CONFIG_DIR, CONFIG_FILE } from "./paths.js";
import { ConfigError } from "../types/errors.js";

/**
 * Configuration schema with defaults
 */
const SettingsSchema = z.object({
  default_output: z.enum(["json", "pretty"]).default("pretty"),
  default_limit: z.number().min(1).max(100).default(20),
});

export type Settings = z.infer<typeof SettingsSchema>;

/**
 * Default settings
 */
const DEFAULT_SETTINGS: Settings = {
  default_output: "pretty",
  default_limit: 20,
};

/**
 * Valid config keys
 */
export const CONFIG_KEYS = ["default_output", "default_limit"] as const;
export type ConfigKey = (typeof CONFIG_KEYS)[number];

/**
 * Load settings from config file
 */
export async function loadSettings(): Promise<Settings> {
  try {
    const content = await readFile(CONFIG_FILE, "utf-8");
    const data = JSON.parse(content);
    return SettingsSchema.parse(data);
  } catch (error) {
    // Return defaults if file doesn't exist or is invalid
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { ...DEFAULT_SETTINGS };
    }
    // Return defaults for invalid JSON/schema
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save settings to config file
 */
async function saveSettings(settings: Settings): Promise<void> {
  try {
    await mkdir(CONFIG_DIR, { recursive: true });
    await writeFile(CONFIG_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
    throw new ConfigError(
      `Failed to save config: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get a specific setting value
 */
export async function getSetting(key: ConfigKey): Promise<string | number> {
  const settings = await loadSettings();
  return settings[key];
}

/**
 * Set a specific setting value
 */
export async function setSetting(
  key: ConfigKey,
  value: string | number
): Promise<void> {
  const settings = await loadSettings();

  // Validate and convert value based on key
  switch (key) {
    case "default_output":
      if (value !== "json" && value !== "pretty") {
        throw new ConfigError(
          `Invalid value for default_output: ${value}. Must be 'json' or 'pretty'`
        );
      }
      settings.default_output = value;
      break;

    case "default_limit":
      const numValue = typeof value === "number" ? value : parseInt(value, 10);
      if (isNaN(numValue) || numValue < 1 || numValue > 100) {
        throw new ConfigError(
          `Invalid value for default_limit: ${value}. Must be a number between 1 and 100`
        );
      }
      settings.default_limit = numValue;
      break;

    default:
      throw new ConfigError(`Unknown config key: ${key}`);
  }

  await saveSettings(settings);
}

/**
 * Reset settings to defaults
 */
export async function resetSettings(): Promise<void> {
  await saveSettings({ ...DEFAULT_SETTINGS });
}

/**
 * Get all settings
 */
export async function getAllSettings(): Promise<Settings> {
  return loadSettings();
}
