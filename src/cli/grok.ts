import { Command } from "commander";
import chalk from "chalk";
import {
  parseNaturalLanguage,
  summarize,
  analyze,
  draft,
  suggestReplies,
  ask,
} from "../api/grok.js";
import { getTweet, getHomeTimeline, getUserTimeline } from "../api/posts.js";
import { getMe, getUserByUsername } from "../api/users.js";
import type { Tweet } from "../types/index.js";
import {
  output,
  isJsonMode,
  printError,
  createSpinner,
} from "../output/index.js";
import { XCLIError, ErrorCode } from "../types/errors.js";

/**
 * Execute a parsed command (simulated for now)
 */
async function executeCommand(command: string): Promise<void> {
  // For now, just print the command that would be executed
  console.log(chalk.dim(`\nWould execute: ${command}`));
  console.log(chalk.yellow("\nTip: Copy and run the command above"));
}

/**
 * Create grok command with subcommands
 */
export function createGrokCommand(): Command {
  const grok = new Command("grok").description("AI-powered features using Grok");

  // Natural language command parsing (default action)
  grok
    .argument("[query]", "Natural language query to parse into a command")
    .option("--execute", "Execute the parsed command automatically", false)
    .action(async (query: string | undefined, options) => {
      if (!query) {
        // Show help if no query
        grok.help();
        return;
      }

      const spinner = createSpinner("Parsing with Grok...");

      try {
        if (!isJsonMode()) {
          spinner.start();
        }

        const result = await parseNaturalLanguage(query);

        if (!isJsonMode()) {
          spinner.stop();

          if (result.confidence < 0.5) {
            console.log(chalk.yellow("Low confidence parsing:"));
            console.log(chalk.dim(result.explanation));
            console.log();
          }

          if (result.command) {
            console.log(chalk.green("Parsed command:"));
            console.log(`  ${chalk.cyan(result.command)}`);
            console.log();
            console.log(chalk.dim(`Confidence: ${(result.confidence * 100).toFixed(0)}%`));
            console.log(chalk.dim(`Explanation: ${result.explanation}`));

            if (options.execute && result.confidence >= 0.7) {
              await executeCommand(result.command);
            } else if (options.execute) {
              console.log(
                chalk.yellow("\nConfidence too low to auto-execute. Run manually.")
              );
            }
          } else {
            console.log(chalk.red("Could not parse into a command."));
            console.log(chalk.dim(result.explanation));
          }
        } else {
          output(result);
        }
      } catch (error) {
        if (!isJsonMode()) {
          spinner.fail("Parsing failed");
        }
        if (error instanceof XCLIError) {
          if (isJsonMode()) {
            output({ error: error.message, code: error.code });
          } else {
            printError(error);
          }
        } else {
          throw error;
        }
        process.exit(1);
      }
    });

  // Summarize command
  grok
    .command("summarize")
    .description("Summarize a thread or user's posts")
    .argument("<target>", "Post ID or @username")
    .option("-l, --length <length>", "Summary length (brief, detailed)", "brief")
    .option("--limit <n>", "Number of posts to summarize (for users)", "10")
    .action(async (target: string, options) => {
      const spinner = createSpinner("Generating summary...");

      try {
        if (!isJsonMode()) {
          spinner.start();
        }

        let content: string;

        if (target.startsWith("@")) {
          // Summarize user's posts
          const username = target.slice(1);
          if (!isJsonMode()) {
            spinner.text = `Fetching posts from @${username}...`;
          }

          const user = await getUserByUsername(username);
          const timeline = await getUserTimeline(user.id, {
            max_results: parseInt(options.limit, 10),
          });

          if (!timeline.data || timeline.data.length === 0) {
            throw new XCLIError(`No posts found for @${username}`, ErrorCode.NOT_FOUND);
          }

          content = timeline.data
            .map(
              (t: Tweet) =>
                `@${user.username}: ${t.text}\n[${t.public_metrics?.like_count || 0} likes, ${t.public_metrics?.retweet_count || 0} reposts]`
            )
            .join("\n\n");

          if (!isJsonMode()) {
            spinner.text = "Generating summary...";
          }
        } else {
          // Summarize a thread/post
          if (!isJsonMode()) {
            spinner.text = "Fetching post...";
          }

          const response = await getTweet(target);
          content = `${response.data.text}`;

          if (!isJsonMode()) {
            spinner.text = "Generating summary...";
          }
        }

        const result = await summarize(content, {
          length: options.length as "brief" | "detailed",
        });

        if (!isJsonMode()) {
          spinner.succeed("Summary generated");

          console.log();
          console.log(chalk.bold("Summary:"));
          console.log(result.summary);

          if (result.keyPoints.length > 0) {
            console.log();
            console.log(chalk.bold("Key Points:"));
            result.keyPoints.forEach((point) => {
              console.log(`  ${chalk.cyan("•")} ${point}`);
            });
          }

          if (result.participants && result.participants.length > 0) {
            console.log();
            console.log(
              chalk.dim(`Participants: ${result.participants.join(", ")}`)
            );
          }
        } else {
          output(result);
        }
      } catch (error) {
        if (!isJsonMode()) {
          spinner.fail("Summarization failed");
        }
        if (error instanceof XCLIError) {
          if (isJsonMode()) {
            output({ error: error.message, code: error.code });
          } else {
            printError(error);
          }
        } else {
          throw error;
        }
        process.exit(1);
      }
    });

  // Analyze command
  grok
    .command("analyze")
    .description("Analyze a post for sentiment, topics, and engagement")
    .argument("<id>", "Post ID to analyze")
    .action(async (id: string) => {
      const spinner = createSpinner("Analyzing post...");

      try {
        if (!isJsonMode()) {
          spinner.start();
          spinner.text = "Fetching post...";
        }

        const response = await getTweet(id);
        const tweet = response.data;

        if (!isJsonMode()) {
          spinner.text = "Analyzing with Grok...";
        }

        const result = await analyze(tweet.text);

        if (!isJsonMode()) {
          spinner.succeed("Analysis complete");

          console.log();
          console.log(chalk.bold("Post:"));
          console.log(chalk.dim(tweet.text.slice(0, 100) + (tweet.text.length > 100 ? "..." : "")));

          console.log();
          console.log(chalk.bold("Analysis:"));

          // Sentiment
          const sentimentColor =
            result.sentiment === "positive"
              ? chalk.green
              : result.sentiment === "negative"
                ? chalk.red
                : chalk.yellow;
          console.log(
            `  Sentiment: ${sentimentColor(result.sentiment)} (${(result.sentimentScore * 100).toFixed(0)}%)`
          );

          // Topics
          if (result.topics.length > 0) {
            console.log(`  Topics: ${result.topics.join(", ")}`);
          }

          // Engagement prediction
          const engagementColor =
            result.engagementPrediction === "high"
              ? chalk.green
              : result.engagementPrediction === "low"
                ? chalk.red
                : chalk.yellow;
          console.log(
            `  Engagement: ${engagementColor(result.engagementPrediction)}`
          );

          // Key points
          if (result.keyPoints.length > 0) {
            console.log();
            console.log(chalk.bold("Key Points:"));
            result.keyPoints.forEach((point) => {
              console.log(`  ${chalk.cyan("•")} ${point}`);
            });
          }
        } else {
          output(result);
        }
      } catch (error) {
        if (!isJsonMode()) {
          spinner.fail("Analysis failed");
        }
        if (error instanceof XCLIError) {
          if (isJsonMode()) {
            output({ error: error.message, code: error.code });
          } else {
            printError(error);
          }
        } else {
          throw error;
        }
        process.exit(1);
      }
    });

  // Draft command
  grok
    .command("draft")
    .description("Draft a post on a given topic")
    .argument("<topic>", "Topic to write about")
    .option(
      "-t, --tone <tone>",
      "Tone (professional, casual, witty, informative)",
      "casual"
    )
    .option("--hashtags", "Include hashtags", false)
    .action(async (topic: string, options) => {
      const spinner = createSpinner("Drafting post...");

      try {
        if (!isJsonMode()) {
          spinner.start();
        }

        const result = await draft(topic, {
          tone: options.tone as "professional" | "casual" | "witty" | "informative",
          hashtags: options.hashtags,
        });

        if (!isJsonMode()) {
          spinner.succeed("Draft ready");

          console.log();
          console.log(chalk.bold("Draft:"));
          console.log(result.draft);

          console.log();
          const charColor =
            result.characterCount > 280 ? chalk.red : chalk.green;
          console.log(charColor(`Characters: ${result.characterCount}/280`));

          if (result.characterCount <= 280) {
            console.log();
            console.log(chalk.dim("To post:"));
            console.log(
              chalk.cyan(`  x post create "${result.draft.replace(/"/g, '\\"')}"`)
            );
          } else {
            console.log();
            console.log(
              chalk.yellow("Draft exceeds 280 characters. Consider editing.")
            );
          }
        } else {
          output(result);
        }
      } catch (error) {
        if (!isJsonMode()) {
          spinner.fail("Draft generation failed");
        }
        if (error instanceof XCLIError) {
          if (isJsonMode()) {
            output({ error: error.message, code: error.code });
          } else {
            printError(error);
          }
        } else {
          throw error;
        }
        process.exit(1);
      }
    });

  // Reply command
  grok
    .command("reply")
    .description("Suggest replies to a post")
    .argument("<id>", "Post ID to reply to")
    .option(
      "-t, --tone <tone>",
      "Tone (agree, disagree, neutral, curious)",
      "neutral"
    )
    .action(async (id: string, options) => {
      const spinner = createSpinner("Generating reply suggestions...");

      try {
        if (!isJsonMode()) {
          spinner.start();
          spinner.text = "Fetching post...";
        }

        const response = await getTweet(id);
        const tweet = response.data;

        if (!isJsonMode()) {
          spinner.text = "Generating suggestions...";
        }

        const suggestions = await suggestReplies(tweet.text, {
          tone: options.tone as "agree" | "disagree" | "neutral" | "curious",
        });

        if (!isJsonMode()) {
          spinner.succeed("Suggestions ready");

          console.log();
          console.log(chalk.bold("Original post:"));
          console.log(chalk.dim(tweet.text.slice(0, 100) + (tweet.text.length > 100 ? "..." : "")));

          console.log();
          console.log(chalk.bold("Suggested Replies:"));

          if (suggestions.length === 0) {
            console.log(chalk.yellow("  No suggestions generated"));
          } else {
            suggestions.forEach((suggestion, i) => {
              console.log();
              console.log(chalk.cyan(`${i + 1}. `) + suggestion);
            });
          }

          console.log();
          console.log(chalk.dim("To reply:"));
          console.log(chalk.dim(`  x post reply ${id} "your reply"`));
        } else {
          output({ postId: id, suggestions });
        }
      } catch (error) {
        if (!isJsonMode()) {
          spinner.fail("Reply suggestion failed");
        }
        if (error instanceof XCLIError) {
          if (isJsonMode()) {
            output({ error: error.message, code: error.code });
          } else {
            printError(error);
          }
        } else {
          throw error;
        }
        process.exit(1);
      }
    });

  // Ask command
  grok
    .command("ask")
    .description("Ask a question about your timeline")
    .argument("<question>", "Question to ask")
    .option("--limit <n>", "Number of posts to include as context", "20")
    .action(async (question: string, options) => {
      const spinner = createSpinner("Thinking...");

      try {
        if (!isJsonMode()) {
          spinner.start();
          spinner.text = "Fetching timeline...";
        }

        const me = await getMe();
        const timeline = await getHomeTimeline(me.id, {
          max_results: parseInt(options.limit, 10),
        });

        if (!timeline.data || timeline.data.length === 0) {
          throw new XCLIError("No posts in timeline to analyze", ErrorCode.NOT_FOUND);
        }

        // Build user map for author lookup
        const userMap = new Map(
          (timeline.includes?.users || []).map((u) => [u.id, u])
        );

        const context = timeline.data
          .map((t: Tweet) => {
            const author = t.author_id ? userMap.get(t.author_id) : undefined;
            return `@${author?.username || "unknown"}: ${t.text} [${t.public_metrics?.like_count || 0} likes]`;
          })
          .join("\n\n");

        if (!isJsonMode()) {
          spinner.text = "Analyzing with Grok...";
        }

        const answer = await ask(question, context);

        if (!isJsonMode()) {
          spinner.succeed("Answer ready");

          console.log();
          console.log(chalk.bold("Question:"));
          console.log(chalk.cyan(question));

          console.log();
          console.log(chalk.bold("Answer:"));
          console.log(answer);

          console.log();
          console.log(chalk.dim(`Based on ${timeline.data.length} posts from your timeline`));
        } else {
          output({ question, answer, postCount: timeline.data.length });
        }
      } catch (error) {
        if (!isJsonMode()) {
          spinner.fail("Question failed");
        }
        if (error instanceof XCLIError) {
          if (isJsonMode()) {
            output({ error: error.message, code: error.code });
          } else {
            printError(error);
          }
        } else {
          throw error;
        }
        process.exit(1);
      }
    });

  return grok;
}
