import { getClient } from "./client.js";
import { SingleUserResponseSchema } from "../types/index.js";

/**
 * User fields to request from API
 */
const USER_FIELDS = [
  "id",
  "name",
  "username",
  "created_at",
  "description",
  "location",
  "url",
  "verified",
  "verified_type",
  "profile_image_url",
  "protected",
  "public_metrics",
  "pinned_tweet_id",
];

/**
 * Get the authenticated user's info
 */
export async function getMe() {
  const client = getClient();
  const response = await client.get("/users/me", SingleUserResponseSchema, {
    "user.fields": USER_FIELDS,
  });
  return response.data;
}

/**
 * Get a user by username
 */
export async function getUserByUsername(username: string) {
  const client = getClient();
  // Remove @ prefix if present
  const cleanUsername = username.replace(/^@/, "");
  const response = await client.get(
    `/users/by/username/${cleanUsername}`,
    SingleUserResponseSchema,
    {
      "user.fields": USER_FIELDS,
    }
  );
  return response.data;
}

/**
 * Get a user by ID
 */
export async function getUserById(id: string) {
  const client = getClient();
  const response = await client.get(
    `/users/${id}`,
    SingleUserResponseSchema,
    {
      "user.fields": USER_FIELDS,
    }
  );
  return response.data;
}
