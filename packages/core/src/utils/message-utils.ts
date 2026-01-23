import { Message, Starter } from '../types/index.js';
import { MessageType } from '../constants/index.js';
import { generateId } from './id.js';

/**
 * Select a starter from the available starters based on query params.
 * If query params match starter attributes, filters to matching starters.
 * Only checks query params that exist in the starter's attributes (ignores
 * unrelated params like UTM tracking codes).
 * Returns a randomly selected starter from the filtered (or full) list.
 */
export function selectStarter(
  starters: Starter[],
  query: Record<string, string> = {}
): Starter | null {
  if (!starters || starters.length === 0) {
    return null;
  }

  // If query params are provided, filter starters by matching attributes
  if (Object.keys(query).length > 0) {
    const filtered = starters.filter((starter) => {
      // Only check query params that exist in this starter's attributes
      // This allows unrelated params (UTM, tracking, etc.) to be ignored
      for (const key in starter.attributes) {
        if (key in query) {
          const queryValue = query[key]?.toLowerCase();
          const attrValue = starter.attributes[key]?.toLowerCase();
          if (queryValue !== attrValue) {
            return false;
          }
        }
      }
      return true;
    });

    if (filtered.length > 0) {
      return filtered[Math.floor(Math.random() * filtered.length)];
    }
    // If no matches, fall back to random from all starters
  }

  return starters[Math.floor(Math.random() * starters.length)];
}

/**
 * Create Messages from a Starter.
 * Returns an array of messages:
 * - If context exists, a CONTEXT message is created (shown as system context)
 * - If text exists, a STARTER message is created (shown as character dialog)
 *
 * Context-only starters (no text) only produce a CONTEXT message.
 * The STARTER message JSON includes text, context, and attributes for the AI.
 *
 * @param starter - The starter to convert
 * @param defaultRole - Role to use if starter doesn't have a name attribute (e.g., ConversationTask.role)
 */
export function starterToMessages(starter: Starter, defaultRole: string = 'Assistant'): Message[] {
  const messages: Message[] = [];
  const timestamp = new Date().toISOString();

  // If context exists, create a CONTEXT message
  // This provides scenario context to the AI and is displayed as system message
  if (starter.context && starter.context.trim()) {
    const contextMessage: Message = {
      messageId: generateId(),
      type: MessageType.CONTEXT,
      role: 'System',
      content: starter.context,
      timestamp,
    };
    // Store starter name in metadata so it can be used for AI response role
    // (important for context-only starters that don't create a STARTER message)
    // Use starter.attributes.name if available, otherwise use defaultRole
    const starterName = starter.attributes?.name || defaultRole;
    contextMessage.metadata = { starterName };
    messages.push(contextMessage);
  }

  // Only create STARTER message if text exists (not empty)
  // Context-only starters don't need a character dialog message
  if (starter.text && starter.text.trim()) {
    const starterContent = JSON.stringify({
      text: starter.text,
      context: starter.context || '',
      ...starter.attributes,
    });

    // Get role from attributes if 'name' is provided, otherwise use defaultRole
    const role = starter.attributes?.name || defaultRole;

    messages.push({
      messageId: generateId(),
      type: MessageType.STARTER,
      role,
      content: starterContent,
      timestamp,
    });
  }

  return messages;
}

/**
 * Create a welcome Message.
 * Uses MessageType.WELCOME to distinguish from JSON-encoded STARTER messages.
 */
export function createWelcomeMessage(welcomeText: string): Message {
  return {
    messageId: generateId(),
    type: MessageType.WELCOME,
    role: 'System',
    content: welcomeText,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Parse starter content from a STARTER message.
 * Returns the parsed object or null if parsing fails.
 */
export function parseStarterContent(
  content: string
): { text: string; context?: string; [key: string]: unknown } | null {
  try {
    return JSON.parse(content) as { text: string; context?: string; [key: string]: unknown };
  } catch {
    // If not valid JSON, treat content as plain text (backwards compatibility)
    return { text: content };
  }
}
