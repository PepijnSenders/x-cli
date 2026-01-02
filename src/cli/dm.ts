import { Command } from "commander";
import {
  listConversations,
  getConversationMessages,
  getMessagesWithUser,
  sendMessageToUser,
  createGroupDM,
  deleteDMEvent,
} from "../api/dm.js";
import { getUserByUsername } from "../api/users.js";
import {
  output,
  isJsonMode,
  printError,
  createSpinner,
  formatRelativeTime,
  createTable,
} from "../output/index.js";
import { XCLIError, ErrorCode } from "../types/errors.js";
import type { DMEvent } from "../types/index.js";

/**
 * Format conversation list for pretty output
 */
function formatConversationList(
  conversations: Array<{ id: string; type: string }>,
  _users?: Array<{ id: string; username: string; name: string }>
): string {
  if (conversations.length === 0) {
    return "No conversations found";
  }

  const table = createTable({
    head: ["Conversation ID", "Type"],
  });

  for (const conv of conversations) {
    table.push([conv.id, conv.type]);
  }

  return table.toString();
}

/**
 * Format DM events for pretty output
 */
function formatMessages(
  events: DMEvent[],
  users?: Array<{ id: string; username: string; name: string }>
): string {
  if (events.length === 0) {
    return "No messages found";
  }

  const userMap = new Map(users?.map((u) => [u.id, u]) || []);
  const lines: string[] = [];

  // Show messages in chronological order (oldest first)
  const sorted = [...events].reverse();

  for (const event of sorted) {
    if (event.event_type !== "MessageCreate" || !event.text) continue;

    const user = userMap.get(event.sender_id);
    const username = user ? `@${user.username}` : event.sender_id;
    const time = formatRelativeTime(event.created_at);

    lines.push(`${username} · ${time}`);
    lines.push(event.text);
    lines.push("");
  }

  return lines.join("\n").trim();
}

/**
 * Create dm command with subcommands
 */
export function createDMCommand(): Command {
  const dm = new Command("dm").description("Direct message commands");

  // List conversations
  dm.command("list")
    .description("List DM conversations")
    .option("-l, --limit <n>", "Number of conversations", "20")
    .action(async (options) => {
      const spinner = createSpinner("Loading conversations...");

      try {
        if (!isJsonMode()) {
          spinner.start();
        }

        const response = await listConversations({
          max_results: parseInt(options.limit, 10),
        });

        if (!isJsonMode()) {
          spinner.stop();
          if (response.data) {
            console.log(
              formatConversationList(response.data, response.includes?.users)
            );
          } else {
            console.log("No conversations found");
          }
        } else {
          output(response);
        }
      } catch (error) {
        if (!isJsonMode()) {
          spinner.fail("Failed to list conversations");
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

  // View conversation with user
  dm.command("view")
    .description("View conversation with a user")
    .argument("<username>", "Username to view conversation with")
    .option("-l, --limit <n>", "Number of messages", "50")
    .action(async (username: string, options) => {
      const spinner = createSpinner("Loading messages...");

      try {
        if (!isJsonMode()) {
          spinner.start();
        }

        const user = await getUserByUsername(username);
        const response = await getMessagesWithUser(user.id, {
          max_results: parseInt(options.limit, 10),
        });

        if (!isJsonMode()) {
          spinner.stop();
          console.log(`\nConversation with @${user.username}\n`);
          if (response.data) {
            console.log(formatMessages(response.data, response.includes?.users));
          } else {
            console.log("No messages found");
          }
        } else {
          output(response);
        }
      } catch (error) {
        if (!isJsonMode()) {
          spinner.fail("Failed to load messages");
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

  // View conversation by ID
  dm.command("conversation")
    .description("View conversation by ID")
    .argument("<id>", "Conversation ID")
    .option("-l, --limit <n>", "Number of messages", "50")
    .action(async (conversationId: string, options) => {
      const spinner = createSpinner("Loading messages...");

      try {
        if (!isJsonMode()) {
          spinner.start();
        }

        const response = await getConversationMessages(conversationId, {
          max_results: parseInt(options.limit, 10),
        });

        if (!isJsonMode()) {
          spinner.stop();
          console.log(`\nConversation ${conversationId}\n`);
          if (response.data) {
            console.log(formatMessages(response.data, response.includes?.users));
          } else {
            console.log("No messages found");
          }
        } else {
          output(response);
        }
      } catch (error) {
        if (!isJsonMode()) {
          spinner.fail("Failed to load messages");
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

  // Send DM
  dm.command("send")
    .description("Send a DM to a user")
    .argument("<username>", "Username to send to")
    .argument("<message>", "Message text")
    .action(async (username: string, message: string) => {
      const spinner = createSpinner("Sending message...");

      try {
        if (!isJsonMode()) {
          spinner.start();
        }

        const user = await getUserByUsername(username);
        const result = await sendMessageToUser(user.id, { text: message });

        if (!isJsonMode()) {
          spinner.succeed(`Message sent to @${user.username}`);
        } else {
          output(result);
        }
      } catch (error) {
        if (!isJsonMode()) {
          spinner.fail("Failed to send message");
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

  // Create group DM
  dm.command("group")
    .description("Create a group DM")
    .option("-u, --user <username>", "User to add (can be repeated)", collect, [])
    .argument("<message>", "Initial message")
    .action(async (message: string, options) => {
      const spinner = createSpinner("Creating group conversation...");

      try {
        if (!isJsonMode()) {
          spinner.start();
        }

        if (options.user.length < 2) {
          throw new XCLIError("Group DM requires at least 2 users (-u user1 -u user2)", ErrorCode.VALIDATION);
        }

        // Resolve usernames to IDs
        const userIds: string[] = [];
        for (const username of options.user) {
          const user = await getUserByUsername(username);
          userIds.push(user.id);
        }

        const result = await createGroupDM(userIds, message);

        if (!isJsonMode()) {
          spinner.succeed(`Group conversation created: ${result.dm_conversation_id}`);
        } else {
          output(result);
        }
      } catch (error) {
        if (!isJsonMode()) {
          spinner.fail("Failed to create group");
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

  // Delete DM
  dm.command("delete")
    .description("Delete a DM event")
    .argument("<event_id>", "DM event ID to delete")
    .action(async (eventId: string) => {
      const spinner = createSpinner("Deleting message...");

      try {
        if (!isJsonMode()) {
          spinner.start();
        }

        const deleted = await deleteDMEvent(eventId);

        if (!isJsonMode()) {
          if (deleted) {
            spinner.succeed("Message deleted");
          } else {
            spinner.fail("Failed to delete message");
          }
        } else {
          output({ deleted });
        }
      } catch (error) {
        if (!isJsonMode()) {
          spinner.fail("Failed to delete message");
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

  return dm;
}

/**
 * Helper to collect repeated options
 */
function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}
