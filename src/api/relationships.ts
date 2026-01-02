import { z } from "zod";
import { getClient } from "./client.js";
import { PaginatedUsersResponseSchema } from "../types/index.js";
import type { PaginationOptions } from "./posts.js";

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
];

/**
 * Response schema for follow/unfollow operations
 */
const FollowResponseSchema = z.object({
  data: z.object({
    following: z.boolean(),
    pending_follow: z.boolean().optional(),
  }),
});

/**
 * Response schema for block/unblock operations
 */
const BlockResponseSchema = z.object({
  data: z.object({
    blocking: z.boolean(),
  }),
});

/**
 * Response schema for mute/unmute operations
 */
const MuteResponseSchema = z.object({
  data: z.object({
    muting: z.boolean(),
  }),
});

/**
 * Follow a user
 */
export async function followUser(sourceUserId: string, targetUserId: string) {
  const client = getClient();
  const response = await client.post(
    `/users/${sourceUserId}/following`,
    FollowResponseSchema,
    { target_user_id: targetUserId }
  );
  return response.data;
}

/**
 * Unfollow a user
 */
export async function unfollowUser(sourceUserId: string, targetUserId: string) {
  const client = getClient();
  const response = await client.delete(
    `/users/${sourceUserId}/following/${targetUserId}`,
    FollowResponseSchema
  );
  return !response.data.following;
}

/**
 * Get users that a user is following
 */
export async function getFollowing(
  userId: string,
  options: PaginationOptions = {}
) {
  const client = getClient();
  const params: Record<string, string | string[] | undefined> = {
    "user.fields": USER_FIELDS,
    max_results: options.max_results?.toString() ?? "100",
    pagination_token: options.pagination_token,
  };

  const response = await client.get(
    `/users/${userId}/following`,
    PaginatedUsersResponseSchema,
    params
  );
  return response;
}

/**
 * Get users that follow a user
 */
export async function getFollowers(
  userId: string,
  options: PaginationOptions = {}
) {
  const client = getClient();
  const params: Record<string, string | string[] | undefined> = {
    "user.fields": USER_FIELDS,
    max_results: options.max_results?.toString() ?? "100",
    pagination_token: options.pagination_token,
  };

  const response = await client.get(
    `/users/${userId}/followers`,
    PaginatedUsersResponseSchema,
    params
  );
  return response;
}

/**
 * Block a user
 */
export async function blockUser(sourceUserId: string, targetUserId: string) {
  const client = getClient();
  const response = await client.post(
    `/users/${sourceUserId}/blocking`,
    BlockResponseSchema,
    { target_user_id: targetUserId }
  );
  return response.data.blocking;
}

/**
 * Unblock a user
 */
export async function unblockUser(sourceUserId: string, targetUserId: string) {
  const client = getClient();
  const response = await client.delete(
    `/users/${sourceUserId}/blocking/${targetUserId}`,
    BlockResponseSchema
  );
  return !response.data.blocking;
}

/**
 * Get blocked users
 */
export async function getBlocked(
  userId: string,
  options: PaginationOptions = {}
) {
  const client = getClient();
  const params: Record<string, string | string[] | undefined> = {
    "user.fields": USER_FIELDS,
    max_results: options.max_results?.toString() ?? "100",
    pagination_token: options.pagination_token,
  };

  const response = await client.get(
    `/users/${userId}/blocking`,
    PaginatedUsersResponseSchema,
    params
  );
  return response;
}

/**
 * Mute a user
 */
export async function muteUser(sourceUserId: string, targetUserId: string) {
  const client = getClient();
  const response = await client.post(
    `/users/${sourceUserId}/muting`,
    MuteResponseSchema,
    { target_user_id: targetUserId }
  );
  return response.data.muting;
}

/**
 * Unmute a user
 */
export async function unmuteUser(sourceUserId: string, targetUserId: string) {
  const client = getClient();
  const response = await client.delete(
    `/users/${sourceUserId}/muting/${targetUserId}`,
    MuteResponseSchema
  );
  return !response.data.muting;
}

/**
 * Get muted users
 */
export async function getMuted(
  userId: string,
  options: PaginationOptions = {}
) {
  const client = getClient();
  const params: Record<string, string | string[] | undefined> = {
    "user.fields": USER_FIELDS,
    max_results: options.max_results?.toString() ?? "100",
    pagination_token: options.pagination_token,
  };

  const response = await client.get(
    `/users/${userId}/muting`,
    PaginatedUsersResponseSchema,
    params
  );
  return response;
}
