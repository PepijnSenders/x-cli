import { Twitter } from "arctic";
import { createServer, type Server } from "http";
import { URL } from "url";
import open from "open";
import { getEnv } from "../config/env.js";
import { saveTokens, type TokenData } from "../config/tokens.js";
import { AuthError } from "../types/errors.js";

const CALLBACK_PORT = 8765;
const CALLBACK_PATH = "/callback";

/**
 * X (Twitter) OAuth 2.0 scopes
 * @see https://developer.x.com/en/docs/authentication/oauth-2-0/authorization-code
 */
export const SCOPES = [
  "tweet.read",
  "tweet.write",
  "users.read",
  "follows.read",
  "follows.write",
  "offline.access", // Required for refresh tokens
  "like.read",
  "like.write",
  "list.read",
  "list.write",
  "bookmark.read",
  "bookmark.write",
  "block.read",
  "block.write",
  "mute.read",
  "mute.write",
  "dm.read",
  "dm.write",
  "space.read",
];

/**
 * Create Twitter OAuth client
 */
export function createTwitterClient(): Twitter {
  const env = getEnv();
  return new Twitter(
    env.X_CLIENT_ID,
    env.X_CLIENT_SECRET || "",
    env.X_REDIRECT_URI
  );
}

/**
 * Generate OAuth authorization URL
 */
export function createAuthorizationURL(
  client: Twitter,
  state: string,
  codeVerifier: string
): URL {
  return client.createAuthorizationURL(state, codeVerifier, SCOPES);
}

/**
 * Start local callback server for OAuth redirect
 */
function startCallbackServer(): Promise<{
  server: Server;
  waitForCallback: Promise<{ code: string; state: string }>;
}> {
  return new Promise((resolve) => {
    let callbackResolve: (value: { code: string; state: string }) => void;
    let callbackReject: (error: Error) => void;

    const waitForCallback = new Promise<{ code: string; state: string }>(
      (res, rej) => {
        callbackResolve = res;
        callbackReject = rej;
      }
    );

    const server = createServer((req, res) => {
      const url = new URL(req.url || "", `http://localhost:${CALLBACK_PORT}`);

      if (url.pathname === CALLBACK_PATH) {
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");

        if (error) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`
            <html>
              <body style="font-family: system-ui; text-align: center; padding: 50px;">
                <h1 style="color: #e0245e;">Authorization Failed</h1>
                <p>${errorDescription || error}</p>
                <p>You can close this window.</p>
              </body>
            </html>
          `);
          callbackReject(new AuthError(errorDescription || error));
          return;
        }

        if (!code || !state) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`
            <html>
              <body style="font-family: system-ui; text-align: center; padding: 50px;">
                <h1 style="color: #e0245e;">Invalid Callback</h1>
                <p>Missing code or state parameter.</p>
                <p>You can close this window.</p>
              </body>
            </html>
          `);
          callbackReject(new AuthError("Invalid callback: missing code or state"));
          return;
        }

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <body style="font-family: system-ui; text-align: center; padding: 50px;">
              <h1 style="color: #1da1f2;">Authorization Successful!</h1>
              <p>You can close this window and return to the terminal.</p>
            </body>
          </html>
        `);

        callbackResolve({ code, state });
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    });

    server.listen(CALLBACK_PORT, () => {
      resolve({ server, waitForCallback });
    });
  });
}

/**
 * Generate cryptographically secure random string
 */
export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate PKCE code verifier
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Perform full OAuth 2.0 PKCE login flow
 */
export async function login(): Promise<TokenData> {
  const client = createTwitterClient();
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  // Start callback server
  const { server, waitForCallback } = await startCallbackServer();

  try {
    // Generate authorization URL
    const authUrl = createAuthorizationURL(client, state, codeVerifier);

    // Open browser
    await open(authUrl.toString());

    // Wait for callback with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new AuthError("Login timed out after 5 minutes")),
        5 * 60 * 1000
      );
    });

    const { code, state: returnedState } = await Promise.race([
      waitForCallback,
      timeoutPromise,
    ]);

    // Verify state
    if (returnedState !== state) {
      throw new AuthError("State mismatch - possible CSRF attack");
    }

    // Exchange code for tokens
    const tokens = await client.validateAuthorizationCode(code, codeVerifier);

    // Calculate expiry timestamp (Arctic 3.x uses methods)
    const expiresAt = Math.floor(tokens.accessTokenExpiresAt().getTime() / 1000);

    const tokenData: TokenData = {
      access_token: tokens.accessToken(),
      refresh_token: tokens.hasRefreshToken() ? tokens.refreshToken() : undefined,
      token_type: "Bearer",
      expires_at: expiresAt,
    };

    // Save tokens
    await saveTokens(tokenData);

    return tokenData;
  } finally {
    server.close();
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenData> {
  const client = createTwitterClient();

  try {
    const tokens = await client.refreshAccessToken(refreshToken);

    const expiresAt = Math.floor(tokens.accessTokenExpiresAt().getTime() / 1000);

    const tokenData: TokenData = {
      access_token: tokens.accessToken(),
      refresh_token: tokens.hasRefreshToken() ? tokens.refreshToken() : refreshToken,
      token_type: "Bearer",
      expires_at: expiresAt,
    };

    await saveTokens(tokenData);

    return tokenData;
  } catch (error) {
    throw new AuthError(
      `Failed to refresh token: ${error instanceof Error ? error.message : "Unknown error"}`,
      true // expired
    );
  }
}

/**
 * Revoke access token
 */
export async function revokeToken(accessToken: string): Promise<void> {
  const client = createTwitterClient();
  await client.revokeToken(accessToken);
}
