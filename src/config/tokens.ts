import { mkdir, readFile, writeFile, unlink } from "fs/promises";
import { dirname } from "path";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { z } from "zod";
import { TOKENS_FILE } from "./paths.js";
import { ConfigError } from "../types/errors.js";
import { homedir, hostname } from "os";

/**
 * Token data schema
 */
const TokenDataSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  token_type: z.string().default("Bearer"),
  expires_at: z.number().optional(),
  scope: z.string().optional(),
});

export type TokenData = z.infer<typeof TokenDataSchema>;

/**
 * Encrypted token file schema
 */
const EncryptedTokensSchema = z.object({
  iv: z.string(),
  data: z.string(),
  tag: z.string(),
});

/**
 * Generate a machine-specific encryption key
 * Uses hostname and home directory as entropy sources
 */
function getMachineKey(): Buffer {
  const machineId = `${hostname()}-${homedir()}-x-cli-v1`;
  return scryptSync(machineId, "x-cli-salt", 32);
}

/**
 * Encrypt token data
 */
function encryptTokens(tokens: TokenData): string {
  const key = getMachineKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const data = JSON.stringify(tokens);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString("hex"),
    data: encrypted,
    tag: tag.toString("hex"),
  });
}

/**
 * Decrypt token data
 */
function decryptTokens(encrypted: string): TokenData {
  const key = getMachineKey();
  const parsed = EncryptedTokensSchema.parse(JSON.parse(encrypted));

  const iv = Buffer.from(parsed.iv, "hex");
  const tag = Buffer.from(parsed.tag, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(parsed.data, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return TokenDataSchema.parse(JSON.parse(decrypted));
}

/**
 * Save tokens to disk (encrypted)
 */
export async function saveTokens(tokens: TokenData): Promise<void> {
  try {
    await mkdir(dirname(TOKENS_FILE), { recursive: true });
    const encrypted = encryptTokens(tokens);
    await writeFile(TOKENS_FILE, encrypted, { mode: 0o600 });
  } catch (error) {
    throw new ConfigError(
      `Failed to save tokens: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Load tokens from disk
 * Returns null if no tokens exist
 */
export async function loadTokens(): Promise<TokenData | null> {
  try {
    const encrypted = await readFile(TOKENS_FILE, "utf8");
    return decryptTokens(encrypted);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw new ConfigError(
      `Failed to load tokens: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Clear stored tokens
 */
export async function clearTokens(): Promise<void> {
  try {
    await unlink(TOKENS_FILE);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw new ConfigError(
        `Failed to clear tokens: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

/**
 * Check if tokens exist
 */
export async function hasTokens(): Promise<boolean> {
  const tokens = await loadTokens();
  return tokens !== null;
}

/**
 * Check if tokens are expired
 */
export function isTokenExpired(tokens: TokenData): boolean {
  if (!tokens.expires_at) {
    return false; // No expiry means doesn't expire
  }
  // Add 60 second buffer
  return Date.now() >= (tokens.expires_at - 60) * 1000;
}

/**
 * Get time until token expires (in seconds)
 */
export function getTokenExpiresIn(tokens: TokenData): number | null {
  if (!tokens.expires_at) {
    return null;
  }
  const expiresIn = Math.floor(tokens.expires_at - Date.now() / 1000);
  return Math.max(0, expiresIn);
}
