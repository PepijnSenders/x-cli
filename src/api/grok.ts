/**
 * Grok API Client
 *
 * Provides AI features using the Grok API (api.x.ai/v1)
 */

import { z } from "zod";
import { AuthError, APIError } from "../types/errors.js";

const GROK_BASE_URL = "https://api.x.ai/v1";
const DEFAULT_MODEL = "grok-2";
const DEFAULT_TIMEOUT = 60000; // 60s for AI responses

/**
 * Chat message structure
 */
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Chat completion response schema
 */
const ChatCompletionResponseSchema = z.object({
  id: z.string(),
  object: z.literal("chat.completion"),
  created: z.number(),
  model: z.string(),
  choices: z.array(
    z.object({
      index: z.number(),
      message: z.object({
        role: z.enum(["assistant"]),
        content: z.string(),
      }),
      finish_reason: z.string().nullable(),
    })
  ),
  usage: z
    .object({
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
      total_tokens: z.number(),
    })
    .optional(),
});

/**
 * Grok analysis result
 */
export interface AnalysisResult {
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  sentimentScore: number;
  topics: string[];
  engagementPrediction: "high" | "medium" | "low";
  keyPoints: string[];
}

/**
 * Summary result
 */
export interface SummaryResult {
  summary: string;
  keyPoints: string[];
  participants?: string[];
}

/**
 * Draft result
 */
export interface DraftResult {
  draft: string;
  characterCount: number;
}

/**
 * NL command parse result
 */
export interface ParsedCommand {
  command: string;
  args: string[];
  confidence: number;
  explanation: string;
}

/**
 * Get the Grok API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new AuthError(
      "XAI_API_KEY environment variable not set. Get your API key from https://x.ai"
    );
  }
  return apiKey;
}

/**
 * Make a chat completion request to Grok
 */
async function chatCompletion(
  messages: ChatMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const apiKey = getApiKey();
  const { model = DEFAULT_MODEL, temperature = 0.7, maxTokens = 1000 } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const response = await fetch(`${GROK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 401) {
        throw new AuthError("Invalid XAI_API_KEY. Check your API key.");
      }
      if (response.status === 429) {
        throw new APIError("Grok rate limit exceeded. Please try again later.");
      }
      throw new APIError(`Grok API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const parsed = ChatCompletionResponseSchema.parse(data);

    if (!parsed.choices.length || !parsed.choices[0].message.content) {
      throw new APIError("Empty response from Grok");
    }

    return parsed.choices[0].message.content;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new APIError("Grok request timed out");
    }
    throw error;
  }
}

/**
 * Parse natural language to CLI command
 */
export async function parseNaturalLanguage(
  input: string
): Promise<ParsedCommand> {
  const systemPrompt = `You are a CLI command parser for the x-cli tool (a Twitter/X CLI).
Your job is to convert natural language into x-cli commands.

Available commands:
- x timeline home - show home timeline
- x timeline user <username> --limit <n> - show user's posts
- x timeline mentions - show mentions
- x search "<query>" --limit <n> - search posts
- x post create "<text>" - create a post
- x post delete <id> - delete a post
- x post reply <id> "<text>" - reply to a post
- x post quote <id> "<text>" - quote a post
- x like <id> - like a post
- x unlike <id> - unlike a post
- x repost <id> - repost
- x unrepost <id> - remove repost
- x user <username> - get user info
- x me - get current user info
- x follow <username> - follow user
- x unfollow <username> - unfollow user
- x followers [username] - list followers
- x following [username] - list following
- x block <username> - block user
- x unblock <username> - unblock user
- x mute <username> - mute user
- x unmute <username> - unmute user
- x dm send <username> "<text>" - send DM
- x dm list - list DM conversations
- x bookmark add <id> - bookmark post
- x bookmark list - list bookmarks
- x list create "<name>" - create list
- x lists - show your lists

Respond ONLY with valid JSON in this format:
{
  "command": "the full x command",
  "args": ["array", "of", "arguments"],
  "confidence": 0.0-1.0,
  "explanation": "brief explanation of parsing"
}

If you cannot parse the input into a valid command, set confidence to 0 and explain why.`;

  const response = await chatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: input },
    ],
    { temperature: 0.3 }
  );

  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr);
    return {
      command: parsed.command || "",
      args: parsed.args || [],
      confidence: parsed.confidence || 0,
      explanation: parsed.explanation || "",
    };
  } catch {
    return {
      command: "",
      args: [],
      confidence: 0,
      explanation: "Failed to parse Grok response",
    };
  }
}

/**
 * Summarize a thread or user's posts
 */
export async function summarize(
  content: string,
  options: { length?: "brief" | "detailed" } = {}
): Promise<SummaryResult> {
  const { length = "brief" } = options;

  const lengthInstruction =
    length === "detailed"
      ? "Provide a detailed summary with comprehensive key points."
      : "Provide a brief, concise summary.";

  const systemPrompt = `You are a social media content summarizer.
${lengthInstruction}

Respond ONLY with valid JSON in this format:
{
  "summary": "the summary text",
  "keyPoints": ["key point 1", "key point 2"],
  "participants": ["@username1", "@username2"]
}

Keep summaries informative but concise. Extract usernames mentioned with @ prefix.`;

  const response = await chatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Summarize this content:\n\n${content}` },
    ],
    { temperature: 0.5, maxTokens: length === "detailed" ? 2000 : 500 }
  );

  try {
    let jsonStr = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr);
    return {
      summary: parsed.summary || "",
      keyPoints: parsed.keyPoints || [],
      participants: parsed.participants,
    };
  } catch {
    return {
      summary: response,
      keyPoints: [],
    };
  }
}

/**
 * Analyze a post for sentiment, topics, etc.
 */
export async function analyze(postContent: string): Promise<AnalysisResult> {
  const systemPrompt = `You are a social media post analyzer.
Analyze the given post for sentiment, topics, and engagement potential.

Respond ONLY with valid JSON in this format:
{
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "sentimentScore": 0.0-1.0 (0=very negative, 0.5=neutral, 1=very positive),
  "topics": ["topic1", "topic2"],
  "engagementPrediction": "high" | "medium" | "low",
  "keyPoints": ["key point 1", "key point 2"]
}`;

  const response = await chatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Analyze this post:\n\n${postContent}` },
    ],
    { temperature: 0.3 }
  );

  try {
    let jsonStr = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr);
    return {
      sentiment: parsed.sentiment || "neutral",
      sentimentScore: parsed.sentimentScore || 0.5,
      topics: parsed.topics || [],
      engagementPrediction: parsed.engagementPrediction || "medium",
      keyPoints: parsed.keyPoints || [],
    };
  } catch {
    return {
      sentiment: "neutral",
      sentimentScore: 0.5,
      topics: [],
      engagementPrediction: "medium",
      keyPoints: [],
    };
  }
}

/**
 * Draft a post on a given topic
 */
export async function draft(
  topic: string,
  options: {
    tone?: "professional" | "casual" | "witty" | "informative";
    hashtags?: boolean;
  } = {}
): Promise<DraftResult> {
  const { tone = "casual", hashtags = false } = options;

  const toneInstructions = {
    professional:
      "Write in a professional, formal tone suitable for business communication.",
    casual:
      "Write in a friendly, conversational tone like talking to a friend.",
    witty: "Write in a clever, humorous tone with wordplay if appropriate.",
    informative:
      "Write in an educational, informative tone that provides value.",
  };

  const hashtagInstruction = hashtags
    ? "Include 1-3 relevant hashtags at the end."
    : "Do not include hashtags.";

  const systemPrompt = `You are a social media content writer for X (Twitter).
${toneInstructions[tone]}
${hashtagInstruction}

IMPORTANT: Keep the post under 280 characters.
Respond ONLY with the post text, nothing else.`;

  const response = await chatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Write a post about: ${topic}` },
    ],
    { temperature: 0.8, maxTokens: 150 }
  );

  // Clean up response
  const draft = response.trim().replace(/^["']|["']$/g, "");

  return {
    draft,
    characterCount: draft.length,
  };
}

/**
 * Suggest replies to a post
 */
export async function suggestReplies(
  postContent: string,
  options: { tone?: "agree" | "disagree" | "neutral" | "curious" } = {}
): Promise<string[]> {
  const { tone = "neutral" } = options;

  const toneInstructions = {
    agree: "Generate replies that express agreement and support.",
    disagree:
      "Generate replies that respectfully express disagreement or alternative views.",
    neutral: "Generate balanced replies without strong opinions either way.",
    curious: "Generate replies that ask follow-up questions or seek more information.",
  };

  const systemPrompt = `You are a social media reply assistant.
${toneInstructions[tone]}

Generate 3 different reply options, each under 280 characters.
Respond ONLY with valid JSON array:
["reply 1", "reply 2", "reply 3"]`;

  const response = await chatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Suggest replies to this post:\n\n${postContent}` },
    ],
    { temperature: 0.8, maxTokens: 500 }
  );

  try {
    let jsonStr = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Ask a question about timeline/content
 */
export async function ask(
  question: string,
  context: string
): Promise<string> {
  const systemPrompt = `You are a helpful assistant that answers questions about social media content and timelines.
Base your answers on the provided context. Be concise and helpful.`;

  const response = await chatCompletion(
    [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Context:\n${context}\n\nQuestion: ${question}`,
      },
    ],
    { temperature: 0.5, maxTokens: 500 }
  );

  return response.trim();
}
