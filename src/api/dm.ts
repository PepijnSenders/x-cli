import { z } from "zod";
import { getClient } from "./client.js";
import {
  DMEventSchema,
  DMConversationSchema,
  SendDMRequestSchema,
  type SendDMRequest,
} from "../types/index.js";
import type { PaginationOptions } from "./posts.js";

/**
 * DM event fields to request from API
 */
const DM_EVENT_FIELDS = [
  "id",
  "event_type",
  "text",
  "sender_id",
  "participant_ids",
  "dm_conversation_id",
  "created_at",
  "attachments",
  "referenced_tweets",
];

/**
 * User fields for expansion
 */
const USER_FIELDS = [
  "id",
  "name",
  "username",
  "profile_image_url",
];

/**
 * DM conversation response with optional participants
 */
const DMConversationResponseSchema = z.object({
  data: z.array(DMConversationSchema).optional(),
  includes: z.object({
    users: z.array(z.object({
      id: z.string(),
      name: z.string(),
      username: z.string(),
      profile_image_url: z.string().optional(),
    })).optional(),
  }).optional(),
  meta: z.object({
    result_count: z.number(),
    next_token: z.string().optional(),
    previous_token: z.string().optional(),
  }).optional(),
});

/**
 * DM events response
 */
const DMEventsResponseSchema = z.object({
  data: z.array(DMEventSchema).optional(),
  includes: z.object({
    users: z.array(z.object({
      id: z.string(),
      name: z.string(),
      username: z.string(),
      profile_image_url: z.string().optional(),
    })).optional(),
  }).optional(),
  meta: z.object({
    result_count: z.number(),
    next_token: z.string().optional(),
    previous_token: z.string().optional(),
  }).optional(),
});

/**
 * Send DM response
 */
const SendDMResponseSchema = z.object({
  data: z.object({
    dm_conversation_id: z.string(),
    dm_event_id: z.string(),
  }),
});

/**
 * Create group DM response
 */
const CreateGroupDMResponseSchema = z.object({
  data: z.object({
    dm_conversation_id: z.string(),
    dm_event_id: z.string(),
  }),
});

/**
 * Delete DM response
 */
const DeleteDMResponseSchema = z.object({
  data: z.object({
    deleted: z.boolean(),
  }),
});

/**
 * List DM conversations for the authenticated user
 */
export async function listConversations(options: PaginationOptions = {}) {
  const client = getClient();
  const params: Record<string, string | string[] | undefined> = {
    "dm_event.fields": DM_EVENT_FIELDS,
    "user.fields": USER_FIELDS,
    expansions: ["participants"],
    max_results: options.max_results?.toString() ?? "20",
    pagination_token: options.pagination_token,
  };

  const response = await client.get(
    "/dm_conversations",
    DMConversationResponseSchema,
    params
  );
  return response;
}

/**
 * Get DM events from a specific conversation
 */
export async function getConversationMessages(
  conversationId: string,
  options: PaginationOptions = {}
) {
  const client = getClient();
  const params: Record<string, string | string[] | undefined> = {
    "dm_event.fields": DM_EVENT_FIELDS,
    "user.fields": USER_FIELDS,
    expansions: ["sender_id", "participant_ids"],
    max_results: options.max_results?.toString() ?? "50",
    pagination_token: options.pagination_token,
  };

  const response = await client.get(
    `/dm_conversations/${conversationId}/dm_events`,
    DMEventsResponseSchema,
    params
  );
  return response;
}

/**
 * Get DM events with a specific user
 */
export async function getMessagesWithUser(
  userId: string,
  options: PaginationOptions = {}
) {
  const client = getClient();
  const params: Record<string, string | string[] | undefined> = {
    "dm_event.fields": DM_EVENT_FIELDS,
    "user.fields": USER_FIELDS,
    expansions: ["sender_id"],
    max_results: options.max_results?.toString() ?? "50",
    pagination_token: options.pagination_token,
  };

  const response = await client.get(
    `/dm_conversations/with/${userId}/dm_events`,
    DMEventsResponseSchema,
    params
  );
  return response;
}

/**
 * Send a DM to a specific user
 */
export async function sendMessageToUser(
  userId: string,
  request: SendDMRequest
) {
  const client = getClient();
  const validated = SendDMRequestSchema.parse(request);
  const response = await client.post(
    `/dm_conversations/with/${userId}/messages`,
    SendDMResponseSchema,
    validated
  );
  return response.data;
}

/**
 * Send a DM to an existing conversation
 */
export async function sendMessageToConversation(
  conversationId: string,
  request: SendDMRequest
) {
  const client = getClient();
  const validated = SendDMRequestSchema.parse(request);
  const response = await client.post(
    `/dm_conversations/${conversationId}/messages`,
    SendDMResponseSchema,
    validated
  );
  return response.data;
}

/**
 * Create a group DM conversation
 */
export async function createGroupDM(
  participantIds: string[],
  message: string
) {
  const client = getClient();
  const body = {
    conversation_type: "Group",
    participant_ids: participantIds,
    message: { text: message },
  };
  const response = await client.post(
    "/dm_conversations",
    CreateGroupDMResponseSchema,
    body
  );
  return response.data;
}

/**
 * Delete a DM event
 */
export async function deleteDMEvent(eventId: string) {
  const client = getClient();
  const response = await client.delete(
    `/dm_events/${eventId}`,
    DeleteDMResponseSchema
  );
  return response.data.deleted;
}
