import { z } from 'zod';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  type Tool,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getPage, getPages, switchPage } from '../browser.js';
import { formatErrorResponse, debugLog, waitForRateLimit } from '../errors.js';
import {
  navigate,
  getPageInfo,
  takeScreenshot,
  scrapePage,
  executeScript,
} from '../scrapers/generic.js';
import {
  scrapeTwitterProfile,
  scrapeTwitterTimeline,
  scrapeTwitterPost,
  scrapeTwitterSearch,
} from '../scrapers/twitter.js';
import {
  scrapeLinkedInProfile,
  scrapeLinkedInPosts,
  scrapeLinkedInSearch,
} from '../scrapers/linkedin.js';

/**
 * Tool Input Schemas
 */

// Browser Tools (Phase 2)
const navigateSchema = z.object({
  url: z.string().describe('URL to navigate to'),
});

const getPageInfoSchema = z.object({});

const listPagesSchema = z.object({});

const switchPageSchema = z.object({
  index: z.number().describe('Page index from list_pages'),
});

const takeScreenshotSchema = z.object({
  fullPage: z.boolean().optional().describe('Capture full page or just viewport (default: false)'),
});

// Generic Tools (Phase 3)
const scrapePageSchema = z.object({
  selector: z.string().optional().describe('CSS selector to scope extraction (optional)'),
});

const executeScriptSchema = z.object({
  script: z.string().describe('JavaScript code to execute (must return JSON-serializable value)'),
});

// Twitter Tools (Phase 4)
const scrapeTwitterProfileSchema = z.object({
  username: z.string().describe('Twitter username (without @)'),
});

const scrapeTwitterTimelineSchema = z.object({
  username: z.string().optional().describe('Username to scrape (omit for home timeline)'),
  count: z.number().optional().describe('Number of tweets to fetch (default: 20, max: 100)'),
});

const scrapeTwitterPostSchema = z.object({
  url: z.string().describe('Full URL of the tweet (e.g., https://x.com/user/status/123)'),
});

const scrapeTwitterSearchSchema = z.object({
  query: z.string().describe('Search query (supports Twitter search operators)'),
  count: z.number().optional().describe('Number of results (default: 20, max: 100)'),
});

// LinkedIn Tools (Phase 5)
const scrapeLinkedInProfileSchema = z.object({
  url: z.string().describe('Full LinkedIn profile URL'),
});

const scrapeLinkedInPostsSchema = z.object({
  url: z.string().describe('LinkedIn profile or company URL'),
  count: z.number().optional().describe('Number of posts (default: 10, max: 50)'),
});

const scrapeLinkedInSearchSchema = z.object({
  query: z.string().describe('Search query'),
  type: z.enum(['people', 'posts', 'companies']).optional().describe('Type of search (default: people)'),
  count: z.number().optional().describe('Number of results (default: 10, max: 50)'),
});

/**
 * Tool Definitions
 */
export const tools: Tool[] = [
  // Browser Tools
  {
    name: 'navigate',
    description: 'Navigate the active page to a URL',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to navigate to',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'get_page_info',
    description: 'Get information about the current page',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_pages',
    description: 'List all pages (tabs) available for control',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'switch_page',
    description: 'Switch to a different page (tab) by index',
    inputSchema: {
      type: 'object',
      properties: {
        index: {
          type: 'number',
          description: 'Page index from list_pages',
        },
      },
      required: ['index'],
    },
  },
  {
    name: 'take_screenshot',
    description: 'Take a screenshot of the current page',
    inputSchema: {
      type: 'object',
      properties: {
        fullPage: {
          type: 'boolean',
          description: 'Capture full page or just viewport (default: false)',
        },
      },
    },
  },

  // Generic Tools
  {
    name: 'scrape_page',
    description: 'Extract text content and links from the current page',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector to scope extraction (optional)',
        },
      },
    },
  },
  {
    name: 'execute_script',
    description: 'Execute custom JavaScript on the page',
    inputSchema: {
      type: 'object',
      properties: {
        script: {
          type: 'string',
          description: 'JavaScript code to execute (must return JSON-serializable value)',
        },
      },
      required: ['script'],
    },
  },

  // Twitter Tools
  {
    name: 'scrape_twitter_profile',
    description: "Scrape a Twitter user's profile information",
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Twitter username (without @)',
        },
      },
      required: ['username'],
    },
  },
  {
    name: 'scrape_twitter_timeline',
    description: "Scrape tweets from a user's timeline or home feed",
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Username to scrape (omit for home timeline)',
        },
        count: {
          type: 'number',
          description: 'Number of tweets to fetch (default: 20, max: 100)',
        },
      },
    },
  },
  {
    name: 'scrape_twitter_post',
    description: 'Scrape a single tweet and its thread context',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Full URL of the tweet (e.g., https://x.com/user/status/123)',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'scrape_twitter_search',
    description: 'Search Twitter for tweets matching a query',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (supports Twitter search operators)',
        },
        count: {
          type: 'number',
          description: 'Number of results (default: 20, max: 100)',
        },
      },
      required: ['query'],
    },
  },

  // LinkedIn Tools
  {
    name: 'scrape_linkedin_profile',
    description: "Scrape a LinkedIn user's profile",
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Full LinkedIn profile URL',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'scrape_linkedin_posts',
    description: 'Scrape posts from a LinkedIn user or company page',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'LinkedIn profile or company URL',
        },
        count: {
          type: 'number',
          description: 'Number of posts (default: 10, max: 50)',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'scrape_linkedin_search',
    description: 'Search LinkedIn for people, posts, or companies',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
        type: {
          type: 'string',
          enum: ['people', 'posts', 'companies'],
          description: 'Type of search (default: people)',
        },
        count: {
          type: 'number',
          description: 'Number of results (default: 10, max: 50)',
        },
      },
      required: ['query'],
    },
  },
];

/**
 * Schema mapping for validation
 */
const schemaMap = {
  // Browser Tools
  navigate: navigateSchema,
  get_page_info: getPageInfoSchema,
  list_pages: listPagesSchema,
  switch_page: switchPageSchema,
  take_screenshot: takeScreenshotSchema,

  // Generic Tools
  scrape_page: scrapePageSchema,
  execute_script: executeScriptSchema,

  // Twitter Tools
  scrape_twitter_profile: scrapeTwitterProfileSchema,
  scrape_twitter_timeline: scrapeTwitterTimelineSchema,
  scrape_twitter_post: scrapeTwitterPostSchema,
  scrape_twitter_search: scrapeTwitterSearchSchema,

  // LinkedIn Tools
  scrape_linkedin_profile: scrapeLinkedInProfileSchema,
  scrape_linkedin_posts: scrapeLinkedInPostsSchema,
  scrape_linkedin_search: scrapeLinkedInSearchSchema,
} as const;

/**
 * Tool Handlers - Browser Tools (Phase 2)
 */

async function handleNavigate(args: z.infer<typeof navigateSchema>) {
  const page = await getPage();
  const result = await navigate(page, args.url);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

async function handleGetPageInfo(_args: z.infer<typeof getPageInfoSchema>) {
  const page = await getPage();
  const info = await getPageInfo(page);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(info, null, 2),
      },
    ],
  };
}

async function handleListPages(_args: z.infer<typeof listPagesSchema>) {
  const pages = await getPages();

  const pageList = await Promise.all(
    pages.map(async (page, index) => ({
      index,
      url: page.url(),
      title: await page.title(),
    }))
  );

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ pages: pageList }, null, 2),
      },
    ],
  };
}

async function handleSwitchPage(args: z.infer<typeof switchPageSchema>) {
  const page = await switchPage(args.index);
  const info = await getPageInfo(page);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          ...info,
        }, null, 2),
      },
    ],
  };
}

async function handleTakeScreenshot(args: z.infer<typeof takeScreenshotSchema>) {
  const page = await getPage();
  const screenshot = await takeScreenshot(page, args.fullPage ?? false);

  return {
    content: [
      {
        type: 'image',
        data: screenshot.toString('base64'),
        mimeType: 'image/png',
      },
    ],
  };
}

/**
 * Tool Handlers - Generic Tools (Phase 3)
 */

async function handleScrapePage(args: z.infer<typeof scrapePageSchema>) {
  const page = await getPage();
  const content = await scrapePage(page, args.selector);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(content, null, 2),
      },
    ],
  };
}

async function handleExecuteScript(args: z.infer<typeof executeScriptSchema>) {
  const page = await getPage();
  const result = await executeScript(page, args.script);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

/**
 * Tool Handlers - Twitter Tools (Phase 4)
 */

async function handleScrapeTwitterProfile(args: z.infer<typeof scrapeTwitterProfileSchema>) {
  debugLog('scrape_twitter_profile', args.username);
  await waitForRateLimit('twitter');
  const page = await getPage();
  const profile = await scrapeTwitterProfile(page, args.username);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(profile, null, 2),
      },
    ],
  };
}

async function handleScrapeTwitterTimeline(args: z.infer<typeof scrapeTwitterTimelineSchema>) {
  debugLog('scrape_twitter_timeline', args.username, args.count);
  await waitForRateLimit('twitter');
  const page = await getPage();
  const tweets = await scrapeTwitterTimeline(page, args.username, args.count);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ tweets, count: tweets.length }, null, 2),
      },
    ],
  };
}

async function handleScrapeTwitterPost(args: z.infer<typeof scrapeTwitterPostSchema>) {
  debugLog('scrape_twitter_post', args.url);
  await waitForRateLimit('twitter');
  const page = await getPage();
  const tweet = await scrapeTwitterPost(page, args.url);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(tweet, null, 2),
      },
    ],
  };
}

async function handleScrapeTwitterSearch(args: z.infer<typeof scrapeTwitterSearchSchema>) {
  debugLog('scrape_twitter_search', args.query, args.count);
  await waitForRateLimit('twitter');
  const page = await getPage();
  const results = await scrapeTwitterSearch(page, args.query, args.count);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(results, null, 2),
      },
    ],
  };
}

/**
 * Tool Handlers - LinkedIn Tools (Phase 5)
 */

async function handleScrapeLinkedInProfile(args: z.infer<typeof scrapeLinkedInProfileSchema>) {
  debugLog('scrape_linkedin_profile', args.url);
  await waitForRateLimit('linkedin');
  const page = await getPage();
  const profile = await scrapeLinkedInProfile(page, args.url);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(profile, null, 2),
      },
    ],
  };
}

async function handleScrapeLinkedInPosts(args: z.infer<typeof scrapeLinkedInPostsSchema>) {
  debugLog('scrape_linkedin_posts', args.url, args.count);
  await waitForRateLimit('linkedin');
  const page = await getPage();
  const posts = await scrapeLinkedInPosts(page, args.url, args.count);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ posts, count: posts.length }, null, 2),
      },
    ],
  };
}

async function handleScrapeLinkedInSearch(args: z.infer<typeof scrapeLinkedInSearchSchema>) {
  debugLog('scrape_linkedin_search', args.query, args.type, args.count);
  await waitForRateLimit('linkedin');
  const page = await getPage();
  const results = await scrapeLinkedInSearch(page, args.query, args.type, args.count);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(results, null, 2),
      },
    ],
  };
}

/**
 * Handler mapping
 */
const handlers = {
  // Browser Tools
  navigate: handleNavigate,
  get_page_info: handleGetPageInfo,
  list_pages: handleListPages,
  switch_page: handleSwitchPage,
  take_screenshot: handleTakeScreenshot,

  // Generic Tools
  scrape_page: handleScrapePage,
  execute_script: handleExecuteScript,

  // Twitter Tools
  scrape_twitter_profile: handleScrapeTwitterProfile,
  scrape_twitter_timeline: handleScrapeTwitterTimeline,
  scrape_twitter_post: handleScrapeTwitterPost,
  scrape_twitter_search: handleScrapeTwitterSearch,

  // LinkedIn Tools
  scrape_linkedin_profile: handleScrapeLinkedInProfile,
  scrape_linkedin_posts: handleScrapeLinkedInPosts,
  scrape_linkedin_search: handleScrapeLinkedInSearch,
} as const;

/**
 * Register all tools with the MCP server
 */
export function registerTools(server: Server) {
  // Register list tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools,
  }));

  // Register call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Validate tool exists
    if (!(name in handlers)) {
      throw new Error(`Unknown tool: ${name}`);
    }

    // Get schema and handler
    const schema = schemaMap[name as keyof typeof schemaMap];
    const handler = handlers[name as keyof typeof handlers];

    // Validate arguments
    let validatedArgs;
    try {
      validatedArgs = schema.parse(args);
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Invalid arguments: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }

    // Execute handler
    try {
      debugLog(`Executing tool: ${name}`);
      return await handler(validatedArgs as never);
    } catch (error) {
      return formatErrorResponse(error instanceof Error ? error : String(error));
    }
  });
}
