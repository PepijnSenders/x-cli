import { z } from "zod";

/**
 * Environment variable schema
 */
const EnvSchema = z.object({
  X_CLIENT_ID: z.string().min(1),
  X_CLIENT_SECRET: z.string().optional(),
  X_REDIRECT_URI: z.string().url().default("http://localhost:8765/callback"),
  XAI_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Load and validate environment variables
 */
export function loadEnv(): Env {
  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    const missing = result.error.issues
      .filter((i) => i.code === "invalid_type" && i.received === "undefined")
      .map((i) => i.path.join("."));

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}\n` +
          "Please set them in your .env file or environment."
      );
    }

    throw new Error(`Invalid environment: ${result.error.message}`);
  }

  return result.data;
}

/**
 * Get environment with lazy loading
 */
let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = loadEnv();
  }
  return cachedEnv;
}
